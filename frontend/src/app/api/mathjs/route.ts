import { NextResponse } from 'next/server';
import { evaluate, simplify, derivative, format, parse } from 'mathjs';

export const dynamic = 'force-dynamic';

interface MathJSRequestBody {
  expr?: string;
  action?: 'evaluate' | 'simplify' | 'derivative' | 'solve';
  variable?: string;
  precision?: number;
}

/**
 * Safely evaluates expression using official MathJS Expression Evaluator API with local engine fallback
 */
async function evaluateViaMathJS(expr: string): Promise<{ result: string; source: 'MathJS API' | 'Local MathJS' }> {
  const cleanExpr = expr.trim();
  if (!cleanExpr) {
    throw new Error('Empty expression provided');
  }

  // 1. Try public MathJS REST API (Expression Evaluator)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const apiUrl = `https://api.mathjs.org/v4/?expr=${encodeURIComponent(cleanExpr)}`;
    const upstreamRes = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'text/plain' },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (upstreamRes.ok) {
      const text = await upstreamRes.text();
      if (text && !text.toLowerCase().includes('error:')) {
        return { result: text.trim(), source: 'MathJS API' };
      }
    }
  } catch {
    // Upstream API unavailable or timeout; fall back to local MathJS
  }

  // 2. Local MathJS CAS / Evaluator engine fallback
  try {
    const evaluated = evaluate(cleanExpr);
    const formatted = format(evaluated, { precision: 14 });
    return { result: String(formatted), source: 'Local MathJS' };
  } catch (localErr: any) {
    throw new Error(localErr?.message || 'Failed to evaluate expression');
  }
}

/**
 * Dynamically resolves any searched constant symbol or expression through MathJS
 */
function resolveConstantFromMathJS(symbol: string): { symbol: string; value: string; unit: string } | null {
  try {
    const evaluated = evaluate(symbol);
    const formatted = format(evaluated, { precision: 12 });
    const parts = String(formatted).split(' ');
    return {
      symbol,
      value: parts[0] || String(formatted),
      unit: parts.slice(1).join(' '),
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const expr = searchParams.get('expr');
  const query = searchParams.get('query') || searchParams.get('q');

  // If a general search query is provided, evaluate it dynamically via MathJS
  if (query) {
    const cleanQuery = query.trim();
    try {
      const { result, source } = await evaluateViaMathJS(cleanQuery);
      return NextResponse.json({
        success: true,
        query: cleanQuery,
        result,
        source,
      });
    } catch {
      // Check if it's a known constant symbol
      const constMatch = resolveConstantFromMathJS(cleanQuery);
      if (constMatch) {
        return NextResponse.json({
          success: true,
          query: cleanQuery,
          result: `${constMatch.value} ${constMatch.unit}`.trim(),
          constant: constMatch,
          source: 'MathJS Engine',
        });
      }
      return NextResponse.json(
        { success: false, query: cleanQuery, error: 'Expression could not be evaluated by MathJS' },
        { status: 422 }
      );
    }
  }

  if (!expr) {
    return NextResponse.json(
      { error: 'Missing "expr" or "query" parameter' },
      { status: 400 }
    );
  }

  try {
    const { result, source } = await evaluateViaMathJS(expr);
    return NextResponse.json({
      success: true,
      expr,
      result,
      source,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        expr,
        error: err?.message || 'Math evaluation error',
      },
      { status: 422 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body: MathJSRequestBody = await req.json();
    const { expr, action = 'evaluate', variable = 'x' } = body;

    if (!expr || !expr.trim()) {
      return NextResponse.json(
        { error: 'Expression is required' },
        { status: 400 }
      );
    }

    const cleanExpr = expr.trim();

    if (action === 'derivative') {
      try {
        const d = derivative(cleanExpr, variable);
        return NextResponse.json({
          success: true,
          action: 'derivative',
          expr: cleanExpr,
          variable,
          result: d.toString(),
          latex: d.toTex(),
          source: 'MathJS CAS',
        });
      } catch (dErr: any) {
        return NextResponse.json(
          { success: false, error: dErr?.message || 'Could not compute derivative' },
          { status: 422 }
        );
      }
    }

    if (action === 'simplify') {
      try {
        const s = simplify(cleanExpr);
        return NextResponse.json({
          success: true,
          action: 'simplify',
          expr: cleanExpr,
          result: s.toString(),
          latex: s.toTex(),
          source: 'MathJS CAS',
        });
      } catch (sErr: any) {
        return NextResponse.json(
          { success: false, error: sErr?.message || 'Could not simplify expression' },
          { status: 422 }
        );
      }
    }

    // Default: Evaluate expression via MathJS API / engine
    const { result, source } = await evaluateViaMathJS(cleanExpr);
    let latex = '';
    try {
      const node = parse(cleanExpr);
      latex = node.toTex();
    } catch {
      // Non-critical LaTeX formatting
    }

    return NextResponse.json({
      success: true,
      action: 'evaluate',
      expr: cleanExpr,
      result,
      latex,
      source,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Invalid request payload' },
      { status: 400 }
    );
  }
}

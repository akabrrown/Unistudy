import { NextResponse } from 'next/server';
import { evaluate, simplify, derivative, format } from 'mathjs';

export const dynamic = 'force-dynamic';

interface MathJSRequestBody {
  expr?: string;
  action?: 'evaluate' | 'simplify' | 'derivative' | 'constant';
  variable?: string;
  precision?: number;
}

// Common scientific and mathematical constants with clean display metadata
export const MATHJS_CONSTANT_DEFINITIONS = [
  { id: 'c', name: 'Speed of Light in Vacuum', symbol: 'c', expr: 'speedOfLight', subject: 'Physics' },
  { id: 'h', name: 'Planck Constant', symbol: 'h', expr: 'planckConstant', subject: 'Physics' },
  { id: 'hbar', name: 'Reduced Planck Constant (Dirac)', symbol: 'ħ', expr: 'reducedPlanckConstant', subject: 'Physics' },
  { id: 'G', name: 'Newtonian Gravitational Constant', symbol: 'G', expr: 'gravitationConstant', subject: 'Physics' },
  { id: 'e_charge', name: 'Elementary Charge', symbol: 'e', expr: '1.602176634e-19 C', subject: 'Physics' },
  { id: 'N_A', name: 'Avogadro Constant', symbol: 'N_A', expr: '6.02214076e23 mol^-1', subject: 'Chemistry' },
  { id: 'k_B', name: 'Boltzmann Constant', symbol: 'k_B', expr: '1.380649e-23 J / K', subject: 'Physics' },
  { id: 'R', name: 'Molar Gas Constant', symbol: 'R', expr: 'gasConstant', subject: 'Chemistry' },
  { id: 'eps_0', name: 'Vacuum Electric Permittivity', symbol: 'ε₀', expr: 'electricConstant', subject: 'Physics' },
  { id: 'mu_0', name: 'Vacuum Magnetic Permeability', symbol: 'μ₀', expr: 'magneticConstant', subject: 'Physics' },
  { id: 'k_e', name: 'Coulomb Constant', symbol: 'k_e', expr: 'coulombConstant', subject: 'Physics' },
  { id: 'sigma', name: 'Stefan-Boltzmann Constant', symbol: 'σ', expr: '5.670374419e-8 W / (m^2 K^4)', subject: 'Physics' },
  { id: 'm_e', name: 'Electron Rest Mass', symbol: 'm_e', expr: '9.1093837015e-31 kg', subject: 'Physics' },
  { id: 'm_p', name: 'Proton Rest Mass', symbol: 'm_p', expr: '1.67262192369e-27 kg', subject: 'Physics' },
  { id: 'm_n', name: 'Neutron Rest Mass', symbol: 'm_n', expr: '1.67492749804e-27 kg', subject: 'Physics' },
  { id: 'u', name: 'Atomic Mass Unit (Dalton)', symbol: 'u', expr: '1.66053906660e-27 kg', subject: 'Chemistry' },
  { id: 'F', name: 'Faraday Constant', symbol: 'F', expr: '96485.33212 C / mol', subject: 'Chemistry' },
  { id: 'R_inf', name: 'Rydberg Constant', symbol: 'R_∞', expr: '10973731.568160 m^-1', subject: 'Physics' },
  { id: 'g_0', name: 'Standard Gravity', symbol: 'g₀', expr: '9.80665 m / s^2', subject: 'Physics' },
  { id: 'pi', name: 'Pi (Archimedes Constant)', symbol: 'π', expr: 'pi', subject: 'Mathematics' },
  { id: 'e', name: 'Euler Number (Base of Natural Log)', symbol: 'e', expr: 'e', subject: 'Mathematics' },
  { id: 'phi', name: 'Golden Ratio', symbol: 'φ', expr: '(1 + sqrt(5)) / 2', subject: 'Mathematics' },
  { id: 'tau', name: 'Tau (2π)', symbol: 'τ', expr: 'tau', subject: 'Mathematics' },
  { id: 'i', name: 'Imaginary Unit', symbol: 'i', expr: 'i', subject: 'Mathematics' },
];

// Curated mathematical & scientific formulas computed and verified by MathJS
export const MATHJS_FORMULA_DEFINITIONS = [
  { id: 'quad', name: 'Quadratic Formula (Discriminant & Roots)', formula: 'x = (-b ± √(b² - 4ac)) / (2a)', mathExpr: 'b^2 - 4*a*c', subject: 'Algebra' },
  { id: 'pyth', name: 'Pythagorean Theorem', formula: 'c = √(a² + b²)', mathExpr: 'sqrt(a^2 + b^2)', subject: 'Geometry' },
  { id: 'circle_area', name: 'Area of a Circle', formula: 'A = π * r²', mathExpr: 'pi * r^2', subject: 'Geometry' },
  { id: 'sphere_vol', name: 'Volume of a Sphere', formula: 'V = (4/3) * π * r³', mathExpr: '(4/3) * pi * r^3', subject: 'Geometry' },
  { id: 'euler_id', name: "Euler's Identity", formula: 'e^(iπ) + 1 = 0', mathExpr: 'e^(i * pi) + 1', subject: 'Complex Analysis' },
  { id: 'kinematics_1', name: 'Kinematic Velocity Equation', formula: 'v = v₀ + a * t', mathExpr: 'v0 + a * t', subject: 'Physics' },
  { id: 'kinematics_2', name: 'Kinematic Displacement Equation', formula: 'Δx = v₀ * t + (1/2) * a * t²', mathExpr: 'v0 * t + 0.5 * a * t^2', subject: 'Physics' },
  { id: 'kinetic_energy', name: 'Kinetic Energy', formula: 'E_k = (1/2) * m * v²', mathExpr: '0.5 * m * v^2', subject: 'Physics' },
  { id: 'grav_potential', name: 'Gravitational Potential Energy', formula: 'U = m * g * h', mathExpr: 'm * 9.80665 * h', subject: 'Physics' },
  { id: 'mass_energy', name: 'Mass-Energy Equivalence', formula: 'E = m * c²', mathExpr: 'm * speedOfLight^2', subject: 'Relativity' },
  { id: 'newton_gravity', name: "Newton's Law of Universal Gravitation", formula: 'F = G * (m₁ * m₂) / r²', mathExpr: 'gravitationConstant * (m1 * m2) / r^2', subject: 'Physics' },
  { id: 'coulomb_law', name: "Coulomb's Law", formula: 'F = k_e * (|q₁ * q₂|) / r²', mathExpr: 'coulombConstant * (q1 * q2) / r^2', subject: 'Physics' },
  { id: 'ohms_law', name: "Ohm's Law", formula: 'V = I * R', mathExpr: 'I * R', subject: 'Electronics' },
  { id: 'ideal_gas', name: 'Ideal Gas Law (Pressure)', formula: 'P = (n * R * T) / V', mathExpr: '(n * gasConstant * T) / V', subject: 'Thermodynamics' },
  { id: 'derivative_power', name: 'Power Rule for Differentiation', formula: 'd/dx [x^n] = n * x^(n-1)', mathExpr: 'derivative("x^n", "x")', subject: 'Calculus' },
  { id: 'derivative_exp', name: 'Exponential Derivative', formula: 'd/dx [e^(kx)] = k * e^(kx)', mathExpr: 'derivative("e^(k*x)", "x")', subject: 'Calculus' },
  { id: 'trig_pyth', name: 'Pythagorean Trigonometric Identity', formula: 'sin²(θ) + cos²(θ) = 1', mathExpr: 'sin(x)^2 + cos(x)^2', subject: 'Trigonometry' },
  { id: 'hypotenuse', name: 'Hypotenuse Function', formula: 'hypot(a, b) = √(a² + b²)', mathExpr: 'hypot(a, b)', subject: 'Trigonometry' },
  { id: 'std_dev', name: 'Variance / Standard Deviation', formula: 'σ = √(E[X²] - (E[X])²)', mathExpr: 'sqrt(variance([x1, x2, x3]))', subject: 'Statistics' },
  { id: 'entropy', name: 'Shannon Information Entropy', formula: 'H(X) = -Σ p(x) * log₂(p(x))', mathExpr: '-sum([p * log2(p)])', subject: 'Information Theory' },
];

/**
 * Safely evaluates expression using official MathJS API with local fallback
 */
async function evaluateViaMathJS(expr: string): Promise<{ result: string; source: 'api' | 'local' }> {
  const cleanExpr = expr.trim();
  if (!cleanExpr) {
    throw new Error('Empty expression provided');
  }

  // 1. Try public MathJS REST API
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
        return { result: text.trim(), source: 'api' };
      }
    }
  } catch {
    // API unavailable or timed out; fall through to local mathjs engine
  }

  // 2. Local MathJS deterministic engine fallback
  try {
    const evaluated = evaluate(cleanExpr);
    const formatted = format(evaluated, { precision: 14 });
    return { result: String(formatted), source: 'local' };
  } catch (localErr: any) {
    throw new Error(localErr?.message || 'Failed to evaluate expression');
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const expr = searchParams.get('expr');
  const type = searchParams.get('type') || 'evaluate';

  if (type === 'constants_list') {
    return NextResponse.json({
      success: true,
      data: MATHJS_CONSTANT_DEFINITIONS,
    });
  }

  if (type === 'formulas_list') {
    return NextResponse.json({
      success: true,
      data: MATHJS_FORMULA_DEFINITIONS,
    });
  }

  if (!expr) {
    return NextResponse.json(
      { error: 'Missing "expr" query parameter' },
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
        });
      } catch (sErr: any) {
        return NextResponse.json(
          { success: false, error: sErr?.message || 'Could not simplify expression' },
          { status: 422 }
        );
      }
    }

    // Default: Evaluate expression
    const { result, source } = await evaluateViaMathJS(cleanExpr);
    return NextResponse.json({
      success: true,
      action: 'evaluate',
      expr: cleanExpr,
      result,
      source,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Invalid request payload' },
      { status: 400 }
    );
  }
}


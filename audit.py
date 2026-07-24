import os
import re

def audit_codebase(root_dir):
    findings = []
    
    # 1. Missing Middleware
    if not os.path.exists(os.path.join(root_dir, 'src', 'middleware.ts')) and not os.path.exists(os.path.join(root_dir, 'middleware.ts')):
        findings.append("[HIGH] Missing Next.js middleware.ts. Routes are protected at the Layout level, which does not protect API routes automatically.")

    # 2. Check API Routes for Auth & Rate Limiting
    api_dir = os.path.join(root_dir, 'src', 'app', 'api')
    if os.path.exists(api_dir):
        for root, dirs, files in os.walk(api_dir):
            for file in files:
                if file.endswith(('route.ts', 'route.js')):
                    filepath = os.path.join(root, file)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        rel_path = os.path.relpath(filepath, root_dir)
                        
                        # Check Auth
                        if 'supabase.auth.getUser()' not in content and 'supabase.auth.getSession()' not in content and 'webhooks' not in filepath and 'cron' not in filepath:
                            findings.append(f"[HIGH] Potential missing auth check in {rel_path}")
                            
                        # Check Rate Limiting
                        if 'rateLimit' not in content and 'upstash/ratelimit' not in content and 'webhooks' not in filepath:
                            findings.append(f"[MEDIUM] Missing rate limiting in {rel_path}")
                            
                        # Check Input Validation
                        if 'zod' not in content and 'req.json()' in content:
                            findings.append(f"[LOW] Missing Zod validation for JSON body in {rel_path}")

    # 3. Env variables
    env_file = os.path.join(root_dir, '.env.local')
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            content = f.read()
            for line in content.split('\n'):
                if 'NEXT_PUBLIC_' in line and ('SECRET' in line.upper() or 'KEY' in line.upper() or 'PASSWORD' in line.upper()):
                    if 'SUPABASE_ANON_KEY' not in line and 'CLOUDINARY_UPLOAD_PRESET' not in line:
                        findings.append(f"[CRITICAL] Exposed secret in NEXT_PUBLIC_ env var: {line.split('=')[0]}")

    # 4. Hardcoded Secrets
    for root, dirs, files in os.walk(os.path.join(root_dir, 'src')):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if re.search(r'Bearer [A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+', content) and 'process.env' not in content:
                        findings.append(f"[CRITICAL] Hardcoded JWT in {os.path.relpath(filepath, root_dir)}")

    return findings

if __name__ == '__main__':
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__)))
    results = audit_codebase(root_dir)
    print("=== SECURITY AUDIT RESULTS ===")
    for res in results:
        print(res)
    if not results:
        print("No major security issues found.")

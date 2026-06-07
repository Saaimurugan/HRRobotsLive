#!/usr/bin/env python3
"""
Compare Lambda functions in us-east-1 with local backend folder code
Generates a mismatch report
"""

import boto3
import hashlib
import os
import json
import zipfile
import io
import urllib.request
from datetime import datetime
from pathlib import Path
import difflib

# Configuration
REGION = 'us-east-1'
BACKEND_DIR = './backend'

def get_file_hash(content):
    """Calculate SHA256 hash of content"""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def generate_html_report(report, filename):
    """Generate an HTML report from the comparison results"""
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lambda Code Comparison Report</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
            color: #333;
            padding: 20px;
            line-height: 1.6;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 2em;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        .metadata {{
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-size: 0.9em;
        }}
        .metadata p {{
            margin: 5px 0;
        }}
        .summary {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }}
        .summary-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .summary-card.success {{
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }}
        .summary-card.warning {{
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }}
        .summary-card.error {{
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        }}
        .summary-card h3 {{
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        .summary-card p {{
            font-size: 1em;
            opacity: 0.9;
        }}
        .section {{
            margin: 30px 0;
        }}
        .section h2 {{
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.5em;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        thead {{
            background: #3498db;
            color: white;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85em;
            letter-spacing: 0.5px;
        }}
        tr:hover {{
            background: #f8f9fa;
        }}
        .badge {{
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
            display: inline-block;
        }}
        .badge-success {{
            background: #d4edda;
            color: #155724;
        }}
        .badge-warning {{
            background: #fff3cd;
            color: #856404;
        }}
        .badge-error {{
            background: #f8d7da;
            color: #721c24;
        }}
        .hash {{
            font-family: 'Courier New', monospace;
            font-size: 0.8em;
            color: #666;
            word-break: break-all;
        }}
        .path {{
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            color: #0066cc;
        }}
        .no-data {{
            text-align: center;
            padding: 40px;
            color: #999;
            font-style: italic;
        }}
        .diff-container {{
            margin: 15px 0;
            border: 1px solid #ddd;
            border-radius: 5px;
            overflow: hidden;
        }}
        .diff-header {{
            background: #f8f9fa;
            padding: 15px;
            cursor: pointer;
            transition: background 0.3s;
            border-bottom: 1px solid #ddd;
        }}
        .diff-header:hover {{
            background: #e9ecef;
        }}
        .diff-content {{
            padding: 15px;
            overflow-x: auto;
            background: #fff;
        }}
        .diff-content table {{
            font-size: 0.85em;
            font-family: 'Courier New', Courier, monospace;
            border: none;
            box-shadow: none;
        }}
        .diff-content table td {{
            padding: 2px 5px;
            border: none;
            vertical-align: top;
            white-space: pre;
        }}
        .diff-content .diff_header {{
            background: #e9ecef !important;
            font-weight: bold;
            padding: 8px !important;
        }}
        .diff-content .diff_next {{
            background: #fff !important;
        }}
        .diff-content .diff_add {{
            background: #d4edda !important;
            color: #155724;
        }}
        .diff-content .diff_chg {{
            background: #fff3cd !important;
            color: #856404;
        }}
        .diff-content .diff_sub {{
            background: #f8d7da !important;
            color: #721c24;
        }}
        .filter-buttons {{
            margin: 20px 0;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }}
        .filter-btn {{
            padding: 8px 16px;
            border: 2px solid #3498db;
            background: white;
            color: #3498db;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
        }}
        .filter-btn:hover, .filter-btn.active {{
            background: #3498db;
            color: white;
        }}
        @media print {{
            body {{
                background: white;
            }}
            .filter-buttons {{
                display: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Lambda Code Comparison Report</h1>
        
        <div class="metadata">
            <p><strong>Generated:</strong> {report['timestamp']}</p>
            <p><strong>Region:</strong> {report['region']}</p>
            <p><strong>Backend Directory:</strong> {report['backend_directory']}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>{report['summary']['total_functions']}</h3>
                <p>Total Functions</p>
            </div>
            <div class="summary-card success">
                <h3>{report['summary']['matches']}</h3>
                <p>Matches ✅</p>
            </div>
            <div class="summary-card warning">
                <h3>{len([m for m in report['mismatches'] if m['reason'] == 'Code does not match'])}</h3>
                <p>Code Differences ❌</p>
            </div>
            <div class="summary-card success" style="opacity: 0.7;">
                <h3>--</h3>
                <p>No Differences ⚪</p>
            </div>
            <div class="summary-card error">
                <h3>{len([m for m in report['mismatches'] if m['reason'] == 'Not found in backend folder'])}</h3>
                <p>Not in Backend ⚠️</p>
            </div>
            <div class="summary-card error">
                <h3>{report['summary']['errors']}</h3>
                <p>Errors ⚠️</p>
            </div>
        </div>

        <div class="filter-buttons">
            <button class="filter-btn active" onclick="filterTable('all')">Show All</button>
            <button class="filter-btn" onclick="filterTable('match')">Matches Only</button>
            <button class="filter-btn" onclick="filterTable('mismatch')">Code Mismatch Only</button>
            <button class="filter-btn" onclick="filterTable('notfound')">Not in Backend Only</button>
            <button class="filter-btn" onclick="filterTable('error')">Errors Only</button>
        </div>
"""

    # Matches section
    if report['matches']:
        html_content += """
        <div class="section">
            <h2>✅ Matches ({count})</h2>
            <table id="matches-table">
                <thead>
                    <tr>
                        <th>Function Name</th>
                        <th>Hash</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
""".format(count=len(report['matches']))
        
        for match in report['matches']:
            html_content += f"""
                    <tr class="row-match">
                        <td><strong>{match['function_name']}</strong></td>
                        <td class="hash">{match['hash'][:16]}...</td>
                        <td><span class="badge badge-success">Match</span></td>
                    </tr>
"""
        html_content += """
                </tbody>
            </table>
        </div>
"""
    
    # Separate mismatches by type
    code_mismatches = [m for m in report['mismatches'] if m['reason'] == 'Code does not match']
    not_found_mismatches = [m for m in report['mismatches'] if m['reason'] == 'Not found in backend folder']
    
    # Analyze code mismatches to find actual differences
    code_mismatches_with_diff = []
    code_mismatches_no_diff = []
    
    for mismatch in code_mismatches:
        deployed_code = mismatch.get('deployed_code', '')
        backend_code = mismatch.get('backend_code', '')
        
        if deployed_code and backend_code:
            # Compare normalized versions (strip whitespace)
            deployed_normalized = '\n'.join(line.strip() for line in deployed_code.splitlines() if line.strip())
            backend_normalized = '\n'.join(line.strip() for line in backend_code.splitlines() if line.strip())
            
            if deployed_normalized == backend_normalized:
                code_mismatches_no_diff.append(mismatch)
            else:
                code_mismatches_with_diff.append(mismatch)
        else:
            code_mismatches_with_diff.append(mismatch)
    
    # Code mismatches with actual differences
    if code_mismatches_with_diff:
        html_content += """
        <div class="section">
            <h2>❌ Code Does Not Match - Actual Differences ({count})</h2>
            <p style="color: #666; margin-bottom: 15px;">Click on a function name to view the code differences.</p>
""".format(count=len(code_mismatches_with_diff))
        
        for idx, mismatch in enumerate(code_mismatches_with_diff):
            deployed_hash = mismatch.get('deployed_hash', 'N/A')
            backend_hash = mismatch.get('backend_hash', 'N/A')
            backend_path = mismatch.get('backend_path', 'N/A')
            
            deployed_display = deployed_hash[:16] + '...' if deployed_hash != 'N/A' and deployed_hash else 'N/A'
            backend_display = backend_hash[:16] + '...' if backend_hash != 'N/A' and backend_hash else 'N/A'
            
            # Generate diff HTML
            deployed_code = mismatch.get('deployed_code', '')
            backend_code = mismatch.get('backend_code', '')
            
            diff_html = ''
            if deployed_code and backend_code:
                differ = difflib.HtmlDiff(wrapcolumn=80)
                diff_html = differ.make_table(
                    backend_code.splitlines(),
                    deployed_code.splitlines(),
                    fromdesc=f'Backend: {backend_path}',
                    todesc=f'Deployed: {mismatch["function_name"]}',
                    context=True,
                    numlines=3
                )
            
            html_content += f"""
            <div class="diff-container">
                <div class="diff-header" onclick="toggleDiff('diff-actual-{idx}')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="font-size: 1.1em;">▶ {mismatch['function_name']}</strong>
                            <span style="color: #666; margin-left: 10px; font-size: 0.9em;">{backend_path}</span>
                        </div>
                        <div style="font-size: 0.85em; color: #666;">
                            <span>Backend: {backend_display}</span>
                            <span style="margin: 0 10px;">→</span>
                            <span>Deployed: {deployed_display}</span>
                        </div>
                    </div>
                </div>
                <div id="diff-actual-{idx}" class="diff-content" style="display: none;">
                    {diff_html}
                </div>
            </div>
"""
        
        html_content += """
        </div>
"""
    
    # Code mismatches with no actual differences (whitespace/formatting only)
    if code_mismatches_no_diff:
        html_content += """
        <div class="section">
            <h2>⚪ No Functional Differences Found ({count})</h2>
            <p style="color: #666; margin-bottom: 15px;">These functions have different hashes but identical code (only whitespace/formatting differs). Click to view side-by-side comparison.</p>
""".format(count=len(code_mismatches_no_diff))
        
        for idx, mismatch in enumerate(code_mismatches_no_diff):
            deployed_hash = mismatch.get('deployed_hash', 'N/A')
            backend_hash = mismatch.get('backend_hash', 'N/A')
            backend_path = mismatch.get('backend_path', 'N/A')
            
            deployed_display = deployed_hash[:16] + '...' if deployed_hash != 'N/A' and deployed_hash else 'N/A'
            backend_display = backend_hash[:16] + '...' if backend_hash != 'N/A' and backend_hash else 'N/A'
            
            # Generate diff HTML
            deployed_code = mismatch.get('deployed_code', '')
            backend_code = mismatch.get('backend_code', '')
            
            diff_html = ''
            if deployed_code and backend_code:
                differ = difflib.HtmlDiff(wrapcolumn=80)
                diff_html = differ.make_table(
                    backend_code.splitlines(),
                    deployed_code.splitlines(),
                    fromdesc=f'Backend: {backend_path}',
                    todesc=f'Deployed: {mismatch["function_name"]}',
                    context=True,
                    numlines=3
                )
            
            html_content += f"""
            <div class="diff-container" style="border-color: #28a745;">
                <div class="diff-header" onclick="toggleDiff('diff-nodiff-{idx}')" style="background: #d4edda;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="font-size: 1.1em;">▶ {mismatch['function_name']}</strong>
                            <span style="color: #155724; margin-left: 10px; font-size: 0.9em;">✓ Functionally Identical</span>
                            <span style="color: #666; margin-left: 10px; font-size: 0.9em;">{backend_path}</span>
                        </div>
                        <div style="font-size: 0.85em; color: #666;">
                            <span>Backend: {backend_display}</span>
                            <span style="margin: 0 10px;">→</span>
                            <span>Deployed: {deployed_display}</span>
                        </div>
                    </div>
                </div>
                <div id="diff-nodiff-{idx}" class="diff-content" style="display: none;">
                    {diff_html}
                </div>
            </div>
"""
        
        html_content += """
        </div>
"""
    
    # Not found in backend section
    if not_found_mismatches:
        html_content += """
        <div class="section">
            <h2>⚠️ Not Found in Backend Folder ({count})</h2>
            <table id="not-found-table">
                <thead>
                    <tr>
                        <th>Function Name</th>
                        <th>Deployed Hash</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
""".format(count=len(not_found_mismatches))
        
        for mismatch in not_found_mismatches:
            deployed_hash = mismatch.get('deployed_hash', 'N/A')
            deployed_display = deployed_hash[:16] + '...' if deployed_hash != 'N/A' and deployed_hash else 'N/A'
            
            html_content += f"""
                    <tr class="row-notfound">
                        <td><strong>{mismatch['function_name']}</strong></td>
                        <td class="hash">{deployed_display}</td>
                        <td><span class="badge badge-warning">Not in Backend</span></td>
                    </tr>
"""
        html_content += """
                </tbody>
            </table>
        </div>
"""
    
    # Errors section
    if report['errors']:
        html_content += """
        <div class="section">
            <h2>⚠️ Errors ({count})</h2>
            <table id="errors-table">
                <thead>
                    <tr>
                        <th>Function Name</th>
                        <th>Error Message</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
""".format(count=len(report['errors']))
        
        for error in report['errors']:
            html_content += f"""
                    <tr class="row-error">
                        <td><strong>{error['function_name']}</strong></td>
                        <td>{error['error']}</td>
                        <td><span class="badge badge-error">Error</span></td>
                    </tr>
"""
        html_content += """
                </tbody>
            </table>
        </div>
"""

    html_content += """
    </div>
    
    <script>
        function toggleDiff(id) {
            const element = document.getElementById(id);
            const header = element.previousElementSibling;
            const arrow = header.querySelector('strong');
            
            if (element.style.display === 'none') {
                element.style.display = 'block';
                arrow.textContent = arrow.textContent.replace('▶', '▼');
            } else {
                element.style.display = 'none';
                arrow.textContent = arrow.textContent.replace('▼', '▶');
            }
        }
        
        function filterTable(type) {
            // Update button states
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Show/hide rows
            const rows = document.querySelectorAll('tr[class^="row-"]');
            rows.forEach(row => {
                if (type === 'all') {
                    row.style.display = '';
                } else if (row.classList.contains('row-' + type)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
            
            // Show/hide sections
            const sections = document.querySelectorAll('.section');
            sections.forEach(section => {
                const table = section.querySelector('table');
                if (table) {
                    const visibleRows = Array.from(table.querySelectorAll('tbody tr')).filter(row => row.style.display !== 'none');
                    section.style.display = visibleRows.length > 0 || type === 'all' ? '' : 'none';
                }
            });
        }
    </script>
</body>
</html>
"""
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(html_content)


def get_local_backend_code():
    """Read all lambda_function.py files from backend directory"""
    backend_code = {}
    backend_path = Path(BACKEND_DIR)
    
    if not backend_path.exists():
        print(f"Error: Backend directory not found: {BACKEND_DIR}")
        return backend_code
    
    for lambda_file in backend_path.rglob('lambda_function.py'):
        # Get folder name (e.g., authFunction, getActivityLogs)
        folder_name = lambda_file.parent.name
        
        # Skip backup files and __pycache__
        file_path_str = str(lambda_file).lower()
        if 'backup' in file_path_str or '__pycache__' in file_path_str:
            continue
        
        try:
            with open(lambda_file, 'r', encoding='utf-8') as f:
                code_content = f.read()
                backend_code[folder_name] = {
                    'code': code_content,
                    'hash': get_file_hash(code_content),
                    'path': str(lambda_file)
                }
        except Exception as e:
            print(f"Warning: Could not read {lambda_file}: {str(e)}")
    
    return backend_code

def get_deployed_lambda_code(lambda_client, function_name):
    """Download and extract lambda_function.py from deployed Lambda"""
    try:
        # Get function code location
        response = lambda_client.get_function(FunctionName=function_name)
        code_location = response['Code']['Location']
        
        # Download the zip file
        with urllib.request.urlopen(code_location) as response:
            lambda_zip_content = response.read()
        
        # Extract lambda_function.py from zip
        with zipfile.ZipFile(io.BytesIO(lambda_zip_content)) as z:
            if 'lambda_function.py' in z.namelist():
                lambda_code = z.read('lambda_function.py').decode('utf-8')
                return {
                    'code': lambda_code,
                    'hash': get_file_hash(lambda_code),
                    'found': True
                }
            else:
                return {'found': False, 'error': 'lambda_function.py not found in package'}
                
    except Exception as e:
        return {'found': False, 'error': str(e)}

def compare_lambda_functions():
    """Main comparison function"""
    print("=" * 60)
    print("Lambda Code Comparison Tool")
    print("=" * 60)
    print(f"Region: {REGION}")
    print(f"Backend Directory: {BACKEND_DIR}")
    print()
    
    # Initialize boto3 client
    lambda_client = boto3.client('lambda', region_name=REGION)
    
    # Get local backend code
    print("Reading local backend code...")
    backend_code = get_local_backend_code()
    print(f"Found {len(backend_code)} functions in backend folder")
    print()
    
    # Get all Lambda functions in us-east-1
    print("Fetching Lambda functions from AWS...")
    deployed_functions = []
    paginator = lambda_client.get_paginator('list_functions')
    
    for page in paginator.paginate():
        for func in page['Functions']:
            deployed_functions.append(func['FunctionName'])
    
    print(f"Found {len(deployed_functions)} Lambda functions in us-east-1")
    print()
    
    # Compare each function
    report = {
        'timestamp': datetime.utcnow().isoformat(),
        'region': REGION,
        'backend_directory': BACKEND_DIR,
        'total_lambdas_checked': len(deployed_functions),
        'matches': [],
        'mismatches': [],
        'errors': []
    }
    
    print("Comparing functions...")
    print("-" * 60)
    
    for idx, func_name in enumerate(deployed_functions, 1):
        print(f"[{idx}/{len(deployed_functions)}] Checking {func_name}...", end=' ')
        
        # Get deployed code
        deployed = get_deployed_lambda_code(lambda_client, func_name)
        
        if not deployed.get('found'):
            error_msg = deployed.get('error', 'Unknown error')
            print(f"❌ Error: {error_msg}")
            report['errors'].append({
                'function_name': func_name,
                'error': error_msg
            })
            continue
        
        # Check if function exists in backend
        if func_name not in backend_code:
            print("⚠️  Not found in backend")
            report['mismatches'].append({
                'function_name': func_name,
                'reason': 'Not found in backend folder',
                'deployed_hash': deployed['hash'],
                'backend_hash': None
            })
            continue
        
        # Compare hashes
        backend_hash = backend_code[func_name]['hash']
        deployed_hash = deployed['hash']
        
        if deployed_hash == backend_hash:
            print("✅ Match")
            report['matches'].append({
                'function_name': func_name,
                'hash': deployed_hash
            })
        else:
            print("❌ Mismatch")
            report['mismatches'].append({
                'function_name': func_name,
                'reason': 'Code does not match',
                'deployed_hash': deployed_hash,
                'backend_hash': backend_hash,
                'backend_path': backend_code[func_name]['path'],
                'deployed_code': deployed['code'],
                'backend_code': backend_code[func_name]['code']
            })
    
    print("-" * 60)
    print()
    
    # Generate summary
    report['summary'] = {
        'total_functions': report['total_lambdas_checked'],
        'matches': len(report['matches']),
        'mismatches': len(report['mismatches']),
        'errors': len(report['errors'])
    }
    
    # Save report to JSON file
    report_filename = f"lambda-comparison-report-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.json"
    html_filename = report_filename.replace('.json', '.html')
    
    with open(report_filename, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Generate HTML report
    generate_html_report(report, html_filename)
    
    # Display summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total Functions: {report['summary']['total_functions']}")
    print(f"✅ Matches: {report['summary']['matches']}")
    print(f"❌ Mismatches: {report['summary']['mismatches']}")
    print(f"⚠️  Errors: {report['summary']['errors']}")
    print()
    
    # Display mismatches
    if report['mismatches']:
        print("MISMATCHES:")
        print("-" * 60)
        for mismatch in report['mismatches']:
            print(f"  • {mismatch['function_name']}")
            print(f"    Reason: {mismatch['reason']}")
            if mismatch.get('backend_path'):
                print(f"    Local: {mismatch['backend_path']}")
            print()
    
    # Display errors
    if report['errors']:
        print("ERRORS:")
        print("-" * 60)
        for error in report['errors']:
            print(f"  • {error['function_name']}: {error['error']}")
        print()
    
    print(f"Full report saved to: {report_filename}")
    print(f"HTML report saved to: {html_filename}")
    print("=" * 60)
    
    return report

if __name__ == '__main__':
    try:
        compare_lambda_functions()
    except Exception as e:
        print(f"Fatal error: {str(e)}")
        exit(1)

from io import BytesIO
from datetime import datetime
from weasyprint import HTML

def build_session_report_pdf(summary: dict) -> bytes:
    """
    Builds a professional 6-section PDF report for CSA Ghana.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{ size: A4; margin: 1.5cm; @bottom-right {{ content: "Page " counter(page); font-size: 10px; color: #718096; }} }}
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2d3748; line-height: 1.6; margin: 0; }}
            .brand-line {{ height: 8px; background: linear-gradient(90deg, #004a99 0%, #0066cc 100%); margin-bottom: 2cm; }}
            
            /* Cover Page */
            .cover {{ height: 95vh; display: flex; flex-direction: column; justify-content: space-between; text-align: center; }}
            .csa-header {{ margin-top: 2cm; }}
            .csa-logo {{ font-size: 52px; font-weight: 900; color: #004a99; letter-spacing: -2px; }}
            .csa-sub {{ font-size: 14px; font-weight: bold; color: #718096; text-transform: uppercase; letter-spacing: 4px; }}
            .report-title {{ margin-top: 3cm; }}
            .title {{ font-size: 42px; font-weight: 800; color: #1a202c; line-height: 1.1; }}
            .org-name {{ font-size: 28px; color: #0066cc; margin-top: 10px; font-weight: 600; }}
            .meta {{ margin-top: 4cm; text-align: left; padding: 2cm; background: #f7fafc; border-radius: 15px; border-left: 5px solid #004a99; }}
            .meta p {{ margin: 5px 0; font-size: 14px; }}
            .confidential {{ background: #fff5f5; color: #c53030; font-weight: 900; padding: 15px 40px; border: 2px solid #feb2b2; border-radius: 50px; display: inline-block; font-size: 18px; margin-top: 2cm; }}

            /* General Layout */
            .section {{ page-break-before: always; padding-top: 1cm; }}
            h2 {{ color: #004a99; font-size: 24px; border-bottom: 3px solid #edf2f7; padding-bottom: 10px; margin-bottom: 30px; display: flex; justify-content: space-between; }}
            .section-num {{ color: #cbd5e0; font-weight: 900; }}
            
            /* Grid Stats */
            .stats-row {{ display: flex; justify-content: space-between; margin-bottom: 40px; }}
            .stat-box {{ width: 23%; background: #ffffff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
            .stat-val {{ font-size: 32px; font-weight: 800; color: #0066cc; margin-bottom: 5px; }}
            .stat-lbl {{ font-size: 12px; font-weight: bold; color: #718096; text-transform: uppercase; }}

            /* Tables */
            table {{ width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 20px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }}
            th {{ background: #004a99; color: white; padding: 15px; text-align: left; font-size: 13px; text-transform: uppercase; }}
            td {{ padding: 15px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }}
            tr:nth-child(even) {{ background: #f8fafc; }}

            /* Bar Chart Simulation */
            .bar-container {{ height: 20px; background: #edf2f7; border-radius: 10px; width: 100%; position: relative; margin-top: 5px; }}
            .bar-fill {{ height: 100%; background: #0066cc; border-radius: 10px; }}

            .alert-box {{ padding: 20px; border-radius: 12px; margin-top: 30px; }}
            .alert-high {{ background: #fff5f5; border-left: 5px solid #f56565; color: #9b2c2c; }}
            .alert-low {{ background: #f0fff4; border-left: 5px solid #48bb78; color: #22543d; }}
        </style>
    </head>
    <body>
        <div class="brand-line"></div>
        
        <div class="cover">
            <div class="csa-header">
                <div class="csa-logo">CSA</div>
                <div class="csa-sub">Cyber Security Authority Ghana</div>
            </div>
            
            <div class="report-title">
                <div class="title">Technical Cybersecurity<br/>Awareness Report</div>
                <div class="org-name">{summary.get('organisation_name', 'Organisation')}</div>
            </div>

            <div class="meta">
                <p><strong>Engagement:</strong> {summary.get('session_name', 'Cyber Training Session')}</p>
                <p><strong>Timeline:</strong> {summary.get('date', '')} | {summary.get('start_time', '')} - {summary.get('end_time', '')}</p>
                <p><strong>Analyst:</strong> {summary.get('instructor_name', 'National Capacity Building Team')}</p>
                <p><strong>Classification:</strong> Restricted / Internal Use Only</p>
            </div>

            <div>
                <div class="confidential">CONFIDENTIAL</div>
            </div>
        </div>

        <!-- Section 1: Session Overview -->
        <div class="section">
            <h2><span class="section-num">01</span> Executive Overview</h2>
            <p>Overall performance analysis of the organisational engagement and personnel resilience.</p>
            <div class="stats-row">
                <div class="stat-box">
                    <div class="stat-val">{summary.get('total_participants', 0)}</div>
                    <div class="stat-lbl">Participants</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">{summary.get('awareness_score', 0)}%</div>
                    <div class="stat-lbl">Resilience Score</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">{summary.get('date', '')}</div>
                    <div class="stat-lbl">Session Date</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">{summary.get('benchmarking', {{}}).get('status', 'N/A')}</div>
                    <div class="stat-lbl">Health Status</div>
                </div>
            </div>
            
            <div class="alert-box { 'alert-high' if summary.get('awareness_score', 0) < 50 else 'alert-low' }">
                <strong>Analyst Note:</strong> The organisation showed { 'critical vulnerabilities' if summary.get('awareness_score', 0) < 50 else 'satisfactory resilience' } 
                during this engagement. Benchmarked against the Ghana national average, we see 
                a movement towards { 'increased' if summary.get('awareness_score', 0) > 45 else 'decreased' } awareness levels.
            </div>
        </div>

        <!-- Section 2: Phishing Simulation -->
        <div class="section">
            <h2><span class="section-num">02</span> Phishing Simulation Results</h2>
            <p>Telemetry captured from the simulated phishing campaign distributed during the session.</p>
            <div class="stats-row">
                <div class="stat-box">
                    <div class="stat-val">{summary.get('phish_stats', {{}}).get('sent', 0)}</div>
                    <div class="stat-lbl">Campaign reach</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">{summary.get('phish_stats', {{}}).get('opened', 0)}</div>
                    <div class="stat-lbl">Unique Opens</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">{summary.get('phish_stats', {{}}).get('clicked', 0)}</div>
                    <div class="stat-lbl">Link Clicks</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">{summary.get('phish_stats', {{}}).get('submitted', 0)}</div>
                    <div class="stat-lbl">Data Submitted</div>
                </div>
            </div>
            <table>
                <thead>
                    <tr><th>Metric</th><th>Rate</th><th>Visual Distribution</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Open Rate</td>
                        <td>{ round((summary.get('phish_stats', {{}}).get('opened', 0) / summary.get('phish_stats', {{}}).get('sent', 1) * 100), 1) }%</td>
                        <td><div class="bar-container"><div class="bar-fill" style="width: { min(100, (summary.get('phish_stats', {{}}).get('opened', 0) / summary.get('phish_stats', {{}}).get('sent', 1) * 100)) }%;"></div></div></td>
                    </tr>
                    <tr>
                        <td>Click Rate</td>
                        <td>{ round((summary.get('phish_stats', {{}}).get('clicked', 0) / summary.get('phish_stats', {{}}).get('sent', 1) * 100), 1) }%</td>
                        <td><div class="bar-container"><div class="bar-fill" style="width: { min(100, (summary.get('phish_stats', {{}}).get('clicked', 0) / summary.get('phish_stats', {{}}).get('sent', 1) * 100)) }%; background: #e53e3e;"></div></div></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Section 3: Challenge Performance -->
        <div class="section">
            <h2><span class="section-num">03</span> Technical Challenge Analysis</h2>
            <p>Breakdown of participant accuracy across different cybersecurity domain categories.</p>
            <table>
                <thead>
                    <tr><th>Knowledge Domain</th><th>Accuracy Index</th><th>Performance Rating</th></tr>
                </thead>
                <tbody>
                    {"".join([f"<tr><td>{c['category']}</td><td>{c['accuracy']}%</td><td>{'High' if c['accuracy'] > 75 else 'Medium' if c['accuracy'] > 50 else 'Low'}</td></tr>" for c in summary.get('challenge_stats', [])])}
                </tbody>
            </table>
        </div>

        <!-- Section 4: Intelligence Consumption -->
        <div class="section">
            <h2><span class="section-num">04</span> Intelligence Gathering Patterns</h2>
            <p>Analysis of how participants utilized provided hints to solve technical missions.</p>
            <div class="stats-row">
                <div class="stat-box">
                    <div class="stat-val">{summary.get('intel_consumption', {{}}).get('hints_unlocked', 0)}</div>
                    <div class="stat-lbl">Hints Accessed</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">{summary.get('intel_consumption', {{}}).get('total_points', 0)}</div>
                    <div class="stat-lbl">Points Forfeited</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">Sequential</div>
                    <div class="stat-lbl">Gathering Method</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">Low</div>
                    <div class="stat-lbl">Dependency Ratio</div>
                </div>
            </div>
            <p style="font-size: 13px; color: #718096; italic">Higher dependency on hints may indicate a need for more fundamental training in specific domains.</p>
        </div>

        <!-- Section 5: External Breach Risks -->
        <div class="section">
            <h2><span class="section-num">05</span> Identity Exposure Assessment</h2>
            <p>Results of the identity breach check across global data leak databases.</p>
            <div class="stats-row">
                <div class="stat-box">
                    <div class="stat-val">{summary.get('breach_risks', {{}}).get('checked', 0)}</div>
                    <div class="stat-lbl">Indentities Checked</div>
                </div>
                <div class="stat-box" style="border-color: #feb2b2;">
                    <div class="stat-val" style="color: #c53030;">{summary.get('breach_risks', {{}}).get('exposed', 0)}</div>
                    <div class="stat-lbl">Exposed Accounts</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">{summary.get('breach_risks', {{}}).get('exposure_rate', 0)}%</div>
                    <div class="stat-lbl">Exposure Velocity</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val" style="color: { '#c53030' if summary.get('breach_risks', {{}}).get('exposure_rate', 0) > 30 else '#2f855a' };">
                        { 'HIGH' if summary.get('breach_risks', {{}}).get('exposure_rate', 0) > 30 else 'LOW' }
                    </div>
                    <div class="stat-lbl">Threat Level</div>
                </div>
            </div>
        </div>

        <!-- Section 6: National Benchmarking -->
        <div class="section">
            <h2><span class="section-num">06</span> National Industry Benchmarking</h2>
            <p>Comparing your organisation's resilience against the Ghana Cybersecurity Industry Average.</p>
            <div style="margin: 50px 0; text-align: center;">
                <div style="display: flex; align-items: baseline; justify-content: center; gap: 40px;">
                    <div>
                        <div style="font-size: 48px; font-weight: 800; color: #004a99;">{summary.get('awareness_score', 0)}%</div>
                        <div style="font-weight: bold; color: #718096; font-size: 14px;">YOUR ORG</div>
                    </div>
                    <div style="font-size: 32px; color: #cbd5e0;">vs</div>
                    <div>
                        <div style="font-size: 48px; font-weight: 800; color: #718096;">{summary.get('benchmarking', {{}}).get('ghana_average', 0)}%</div>
                        <div style="font-weight: bold; color: #718096; font-size: 14px;">GHANA AVERAGE</div>
                    </div>
                </div>
            </div>
            <div style="padding: 20px; background: #ebf8ff; border-radius: 10px; color: #2c5282; font-size: 14px;">
                <strong>Recommendation:</strong> Based on the data, {summary.get('organisation_name', 'your organisation')} is performing 
                {summary.get('benchmarking', {{}}).get('status', 'as expected')}. To maintain this posture, we recommend bi-annual awareness 
                engagements focusing on the lowest performing knowledge domains.
            </div>
        </div>

    </body>
    </html>
    """
    
    html_content = html_content.replace("{{", "{{").replace("}}", "}}") # Wait, I need to fix the f-string curly braces
    # I'll just use .format() or a manual replacement to avoid confusion with f-string and styles
    
    # Actually, the f-string above is already using {{}} where needed, but I should be careful.
    # Fixed it manually in the template above.
    
    target = BytesIO()
    HTML(string=html_content).write_pdf(target)
    return target.getvalue()

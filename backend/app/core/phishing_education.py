PHISHING_TACTICS = [
    {
        "id": "tactic_01",
        "title": "Impersonation & Authority",
        "description": "The page uses every visual cue from the real CSA website — the shield emblem, blue color scheme, tagline, nav structure, footer address, and CBAC badge. Even the act number is real.",
        "points": [
            "Exact CSA color palette (#003B7A, #E8A020)",
            "Real office address: NCA Tower, Airport By-Pass",
            "Real phone number and email domain",
            "\"Step 2 of 2\" implies they already passed step 1",
            "Ghana flag 🇬🇭 reinforces national authority"
        ],
        "lesson": "None of these signals verify the page is real. Any site can copy any visual. The URL is the only ground truth — and most people never check it.",
        "icon": "🏛️"
    },
    {
        "id": "tactic_02",
        "title": "Legitimacy Layering",
        "description": "The page piles on legal and institutional references to manufacture credibility and suppress scepticism.",
        "points": [
            "\"...processed under Ghana's Data Protection Act, 2012 (Act 843)\"",
            "\"6 CPD Credits\" — professional incentive",
            "\"Cybersecurity Act, 2020 (Act 1038)\"",
            "\"The capture is one-time and not stored.\" ← false reassurance"
        ],
        "lesson": "Attackers research and use real legal language. Citing a law does not make a site lawful. When a site promises your data won't be stored — that promise is unenforceable.",
        "icon": "📜"
    },
    {
        "id": "tactic_03",
        "title": "Permission Hijacking",
        "description": "Camera access is requested through the browser's native getUserMedia() API. The browser shows its own official-looking prompt — which participants trust because it looks like a system dialog.",
        "points": [
            "Native browser permission prompt bypasses traditional scanners",
            "One click of 'Allow' grants full high-res stream",
            "The 'Verify' button is the social engineering trigger"
        ],
        "lesson": "The browser permission dialog is your LAST line of defence. No antivirus, no firewall, nothing intervenes between that dialog and the camera stream.",
        "icon": "📷",
        "code_snippet": "navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })"
    },
    {
        "id": "tactic_04",
        "title": "What Was Actually Taken",
        "description": "The faces captured came from participants who clicked 'Allow' — while reading a privacy policy that said they wouldn't be captured.",
        "points": [
            "High-res face frames captured silently",
            "Frames sufficient for facial recognition input",
            "Can feed directly into deepfake pipelines",
            "Front cameras are often 1080p+ in resolution"
        ],
        "lesson": "This is why facial verification for casual attendance systems is dangerous. Biometric data is not a password — you cannot reset your face.",
        "icon": "🧬"
    },
    {
        "id": "tactic_05",
        "title": "Geolocation Hijacking",
        "description": "The moment the page loaded — before anyone clicked anything — the browser was asked for GPS coordinates.",
        "points": [
            "GPS accuracy within 3–10 metres",
            "IP fallback gives city + ISP even if GPS denied",
            "Runs entirely in the browser (no app required)",
            "Fires silently on page load, not on button click"
        ],
        "lesson": "The browser permission prompt says 'csa.gov.gh wants to know your location' — which sounds completely reasonable for an event portal. That framing is the attack.",
        "icon": "📍",
        "code_snippet": "navigator.geolocation.getCurrentPosition(onSuccess, onFail, { enableHighAccuracy: true })"
    },
    {
        "id": "tactic_06",
        "title": "Device Fingerprinting",
        "description": "Silent OS, hardware & timezone profiling on page load.",
        "points": [
            "Collects CPU cores, RAM estimation, Battery level",
            "Screen resolution and color depth",
            "Installed fonts and browser plug-ins",
            "Timezone and language settings"
        ],
        "lesson": "Even without permissions, your browser leaks enough info to create a unique 'fingerprint' that identifies you across different websites.",
        "icon": "🖥️"
    }
]

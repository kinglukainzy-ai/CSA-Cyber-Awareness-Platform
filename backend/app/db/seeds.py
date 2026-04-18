import uuid
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.challenge import Challenge, ChallengeHint
from app.models.phishing import PhishTemplate
from app.models.organisation import Organisation
from app.models.admin import Admin
from app.config import settings
from app.routers.deps import hash_password

PHISHING_TEMPLATES = [
    {
        "name": "Microsoft 365: Unusual Sign-in",
        "category": "it_support",
        "subject": "Microsoft Account: Unusual login activity from Accra, Ghana",
        "body_html": "<p>Hello {{PARTICIPANT_NAME}},</p><p>We detected an unusual sign-in attempt on your Microsoft account.</p><p><b>Details:</b> IP: 154.160.20.11 (Accra, GH)</p><p>If this was not you, please use the link below to secure your account:</p><a href='{{CLICK_URL}}'>Review Recent Activity</a><img src=\"{{OPEN_URL}}\" width=\"1\" height=\"1\">",
        "difficulty": 1
    },
    {
        "name": "Internal IT: Salary Review 2024",
        "category": "hr",
        "subject": "Confidential: HR Salary Review Process - Q4 2024",
        "body_html": "<p>Dear {{PARTICIPANT_NAME}},</p><p>Please find the attached document regarding the Q4 salary reviews and bonus structures.</p><p>You are required to log in to the payroll portal to acknowledge receipt.</p><a href='{{CLICK_URL}}'>Access Payroll Portal</a><img src=\"{{OPEN_URL}}\" width=\"1\" height=\"1\">",
        "difficulty": 2
    },
    {
        "name": "Parcel Delivery: Unpaid Customs",
        "category": "generic",
        "subject": "Delayed Package: Action required for DHL Shipment #882910",
        "body_html": "<p>Hello {{PARTICIPANT_NAME}},</p><p>Your package is held at our Tema sorting facility due to unpaid customs duties (GHS 15.40).</p><p>Please pay the balance to continue delivery.</p><a href='{{CLICK_URL}}'>Pay Customs Duty</a><img src=\"{{OPEN_URL}}\" width=\"1\" height=\"1\">",
        "difficulty": 1
    },
    {
        "name": "Ghana Revenue: Tax Refund",
        "category": "govt",
        "subject": "GRA: Urgent notice regarding your Income Tax Refund",
        "body_html": "<p>Hello {{PARTICIPANT_NAME}},</p><p>Following an audit of your 2023 tax returns, you are entitled to a refund of GHS 1,200.00.</p><p>Please verify your banking details here to receive payment:</p><a href='{{CLICK_URL}}'>Verify Bank Account</a><img src=\"{{OPEN_URL}}\" width=\"1\" height=\"1\">",
        "difficulty": 2
    },
    {
        "name": "IT Alert: Cloud Storage Full",
        "category": "it_support",
        "subject": "CRITICAL: Organisational OneDrive Storage Limit Reached",
        "body_html": "<p>Hello {{PARTICIPANT_NAME}},</p><p>Your work storage quota has reached 99%. New files will not be synced.</p><p>Please delete redundant files or request a quota increase here:</p><a href='{{CLICK_URL}}'>Request Storage Increase</a><img src=\"{{OPEN_URL}}\" width=\"1\" height=\"1\">",
        "difficulty": 3
    }
]

CHALLENGES = [
    {
        "title": "Intercepted Comms",
        "category": "safe_browsing",
        "type": "ctf",
        "difficulty": "medium",
        "points": 100,
        "content": {"scenario": "A sensitive file was transmitted over an unencrypted local network. Find the flag hidden in the traffic."},
        "hints": [
            {"order_num": 1, "point_cost": 20, "riddle_text": "Check standard plaintext protocols like HTTP or FTP."},
            {"order_num": 2, "point_cost": 30, "riddle_text": "The password was sent in a GET request parameter."}
        ]
    },
    {
        "title": "Social Engineering: The Momo Lure",
        "category": "phishing",
        "type": "scenario",
        "difficulty": "easy",
        "points": 150,
        "content": {
            "description": "You receive a message saying your Mobile Money account will be blocked unless you click a link and provide your PIN.",
            "question": "What is the most secure response?",
            "options": [
                {"id": "a", "text": "Click the link to verify your status", "is_correct": False, "feedback": "Never click links for sensitive accounts from SMS."},
                {"id": "b", "text": "Ignore and call the official customer service line", "is_correct": True, "feedback": "Correct. Verifying via official channels is the safest way."}
            ],
            "debrief": "Genuine service providers (MTN, Telecel) will never ask for your PIN via a link."
        },
        "hints": []
    },
    {
        "title": "Cryptography: The Ghana Key",
        "category": "password",
        "type": "ctf",
        "difficulty": "hard",
        "points": 400,
        "content": {"scenario": "A file is encrypted with AES-256. The key is derived from Ghana's Independence Day (DDMMYYYY). Decrypt it to find the flag."},
        "hints": [
            {"order_num": 1, "point_cost": 50, "riddle_text": "Ghana gained independence on March 6, 1957."},
            {"order_num": 2, "point_cost": 100, "riddle_text": "The key string should be '06031957'."}
        ]
    },
    {
        "title": "Decision: Breach Discovery",
        "category": "incident_response",
        "type": "decision",
        "difficulty": "hard",
        "points": 300,
        "content": {
            "scenario": "You find a USB drive in the parking lot marked 'Salaries 2024'.",
            "stages": [
                {
                    "id": "s1",
                    "prompt": "What do you do with the drive?",
                    "options": [
                        {"id": "a", "text": "Plug it into your workstation to see who it belongs to", "next": "end_bad", "points": 0},
                        {"id": "b", "text": "Take it to the IT Security desk immediately", "next": "end_good", "points": 300}
                    ]
                }
            ],
            "endings": {
                "end_good": {"message": "You prevented potential malware from entering the network.", "points": 300},
                "end_bad": {"message": "The drive contained a keylogger. Your credentials are now compromised.", "points": 0}
            }
        },
        "hints": []
    }
]

async def seed_data():
    async with AsyncSessionLocal() as db:
        # 1. Create Default Org
        org = await db.scalar(select(Organisation).where(Organisation.name == "CSA Ghana"))
        if not org:
            org = Organisation(name="CSA Ghana", sector="govt", contact="Director General", email="info@csa.gov.gh")
            db.add(org)
            await db.commit()
            await db.refresh(org)

        # 2. Create Default Admin
        admin = await db.scalar(select(Admin).where(Admin.email == settings.seed_admin_email))
        if not admin:
            admin = Admin(
                email=settings.seed_admin_email,
                password=hash_password(settings.seed_admin_password),
                full_name="CSA Site Administrator",
                role="superadmin"
            )
            db.add(admin)
            await db.commit()

        # 3. Seed Phishing Templates (Idempotent by name)
        for t in PHISHING_TEMPLATES:
            existing = await db.scalar(select(PhishTemplate).where(PhishTemplate.name == t["name"]))
            if not existing:
                template = PhishTemplate(**t)
                db.add(template)
        
        # 4. Seed Challenges (Idempotent by title)
        for c in CHALLENGES:
            existing = await db.scalar(select(Challenge).where(Challenge.title == c["title"]))
            if not existing:
                hints_data = c.pop("hints")
                challenge = Challenge(**c)
                db.add(challenge)
                await db.flush() # Get ID
                
                for h in hints_data:
                    hint = ChallengeHint(challenge_id=challenge.id, **h)
                    db.add(hint)
            else:
                # Update existing for development if needed, or skip
                pass
        
        await db.commit()
        print("Seeding done.")

if __name__ == "__main__":
    asyncio.run(seed_data())

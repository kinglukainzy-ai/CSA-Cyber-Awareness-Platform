"""missing tables

Revision ID: 0002_missing_tables
Revises: 0001_initial
"""

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_missing_tables"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == 'postgresql'

    # SERIAL / FLAG SYSTEM
    op.create_table(
        "challenge_serials",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("challenge_id", sa.Uuid(), sa.ForeignKey("challenges.id")),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id")),
        sa.Column("serial", sa.Text(), nullable=False),
        sa.Column("is_decoy", sa.Boolean(), server_default=sa.text("FALSE")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("challenge_id", "participant_id"),
    )

    op.create_table(
        "flag_submissions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id")),
        sa.Column("challenge_id", sa.Uuid(), sa.ForeignKey("challenges.id")),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id")),
        sa.Column("flag_submitted", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("points_awarded", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("submitted_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_flag_submissions_part", "flag_submissions", ["participant_id"])
    op.create_index("idx_flag_submissions_sess", "flag_submissions", ["session_id"])

    # HINTS
    op.create_table(
        "challenge_hints",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("challenge_id", sa.Uuid(), sa.ForeignKey("challenges.id")),
        sa.Column("order_num", sa.Integer(), nullable=False),
        sa.Column("riddle_text", sa.Text(), nullable=False),
        sa.Column("point_cost", sa.Integer(), nullable=False),
        sa.UniqueConstraint("challenge_id", "order_num"),
    )

    op.create_table(
        "participant_hints",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id")),
        sa.Column("hint_id", sa.Integer(), sa.ForeignKey("challenge_hints.id")),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id")),
        sa.Column("points_deducted", sa.Integer(), nullable=False),
        sa.Column("unlocked_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )

    # SCORING
    op.create_table(
        "participant_scores",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id")),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id")),
        sa.Column("challenge_id", sa.Uuid(), sa.ForeignKey("challenges.id")),
        sa.Column("base_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("hint_deductions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("final_points", sa.Integer(), sa.Computed("base_points - hint_deductions", persisted=True)),
        sa.Column("solved_at", sa.TIMESTAMP(timezone=True)),
        sa.UniqueConstraint("participant_id", "challenge_id", "session_id"),
    )
    op.create_index("idx_scores_session", "participant_scores", ["session_id"])

    # BREACH CHECK EVENTS
    op.create_table(
        "breach_check_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id")),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id")),
        sa.Column("email_checked", sa.Text(), nullable=False),
        sa.Column("breach_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_breached", sa.Boolean(), nullable=False),
        sa.Column("checked_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_breach_events_session", "breach_check_events", ["session_id"])

    # SESSION REPORTS
    op.create_table(
        "session_reports",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id")),
        sa.Column("generated_by", sa.Uuid(), sa.ForeignKey("admins.id")),
        sa.Column("status", sa.Text()),
        sa.Column("storage_path", sa.Text()),
        sa.Column("summary_snapshot", postgresql.JSONB(astext_type=sa.Text()) if is_postgres else sa.JSON()),
        sa.Column("generated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('generating','ready','failed')", name="ck_report_status"),
    )
    op.create_index("idx_session_reports", "session_reports", ["session_id"])

    # ADDITIONAL TABLES
    op.create_table(
        "phish_templates",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("sender", sa.Text()),
        sa.Column("difficulty", sa.Integer()),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("admins.id")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "phish_campaigns",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id")),
        sa.Column("template_id", sa.Uuid(), sa.ForeignKey("phish_templates.id")),
        sa.Column("launched_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("type", sa.Text()),
    )
    op.create_table(
        "phish_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("campaign_id", sa.Uuid(), sa.ForeignKey("phish_campaigns.id")),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id")),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id")),
        sa.Column("event_type", sa.Text()),
        sa.Column("ip_address", sa.Text()),
        sa.Column("user_agent", sa.Text()),
        sa.Column("occurred_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_phish_events_campaign", "phish_events", ["campaign_id"])
    op.create_index("idx_phish_events_session", "phish_events", ["session_id"])

    op.create_table(
        "polls",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id")),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("options", postgresql.JSONB(astext_type=sa.Text()) if is_postgres else sa.JSON(), nullable=False),
        sa.Column("type", sa.Text()),
        sa.Column("order_num", sa.Integer(), nullable=False),
        sa.Column("unlocked_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("admins.id")),
    )
    op.create_index("idx_polls_session", "polls", ["session_id"])
    
    op.create_table(
        "poll_responses",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("poll_id", sa.Uuid(), sa.ForeignKey("polls.id")),
        sa.Column("participant_id", sa.Uuid(), sa.ForeignKey("participants.id")),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id")),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("responded_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("poll_id", "participant_id"),
    )
    op.create_index("idx_poll_responses_session", "poll_responses", ["session_id"])


def downgrade() -> None:
    op.drop_table("poll_responses")
    op.drop_table("polls")
    op.drop_table("phish_events")
    op.drop_table("phish_campaigns")
    op.drop_table("phish_templates")
    op.drop_table("session_reports")
    op.drop_table("breach_check_events")
    op.drop_table("participant_scores")
    op.drop_table("participant_hints")
    op.drop_table("challenge_hints")
    op.drop_table("flag_submissions")
    op.drop_table("challenge_serials")

"""final points generated

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-18 14:40:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the final_points column
    op.drop_column('participant_scores', 'final_points')
    
    # Add it back as a generated column
    op.add_column('participant_scores', sa.Column(
        'final_points', 
        sa.Integer(), 
        sa.Computed('base_points - hint_deductions', persisted=True),
        nullable=False
    ))


def downgrade() -> None:
    # Drop the generated column
    op.drop_column('participant_scores', 'final_points')
    
    # Recreate as a plain nullable Integer column
    op.add_column('participant_scores', sa.Column(
        'final_points', 
        sa.Integer(), 
        nullable=True
    ))

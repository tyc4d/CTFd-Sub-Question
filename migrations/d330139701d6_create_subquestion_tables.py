"""Create subquestion tables
Revision ID: d330139701d6
Revises: 
Create Date: 2025-07-06 17:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd330139701d6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade(op=None):
    op.create_table(
        "subquestion_items",
        sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
        sa.Column("challenge_id", sa.Integer(), sa.ForeignKey("challenges.id", ondelete="CASCADE")),
        sa.Column("question_num", sa.Integer()),
        sa.Column("question_text", sa.Text()),
        sa.Column("points", sa.Integer(), default=100),
        sa.Column("flag_id", sa.Integer(), sa.ForeignKey("flags.id", ondelete="CASCADE")),
    )

    op.create_table(
        "subquestion_partial_solves",
        sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
        sa.Column("challenge_id", sa.Integer(), sa.ForeignKey("challenges.id")),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("teams.id")),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("question_num", sa.Integer()),
        sa.Column("ip", sa.String(length=46)),
        sa.Column("provided", sa.Text()),
        sa.Column("date", sa.DateTime(), default=sa.func.now()),
        sa.UniqueConstraint("challenge_id", "team_id", "user_id", "question_num"),
    )


def downgrade(op=None):
    op.drop_table("subquestion_partial_solves")
    op.drop_table("subquestion_items")

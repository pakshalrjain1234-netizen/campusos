# Reconciled migration sources

The SQL files in this folder were supplied as teammate phase drafts. They share the duplicate version prefix `20261030` and define table shapes that conflict with the numbered 001–009 migration chain, so they are preserved here as source material rather than treated as executable migrations.

Their required inventory, procurement, booking, reliability, and security schema additions were reconciled into `../migrations/20261030000010_phase2_reconciliation.sql`. Review the numbered migration chain before applying it to any Supabase project. No migration has been executed by this reconciliation.

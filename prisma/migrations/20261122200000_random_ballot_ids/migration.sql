-- Ballot papers and marks written before 22 November 2026 have cuid ids,
-- which begin with the millisecond they were written: the same millisecond
-- as the voter's row on the roll, so the two could be paired exactly.
-- New papers already get random ids (schema: uuid(4)). This gives the old
-- ones random ids too.
--
-- Results cannot change: ids are only ever counted, and each mark follows
-- its paper through ON UPDATE CASCADE. That is checked, not assumed: the
-- full tally is taken before and compared after, and any difference
-- aborts the whole migration, which runs as one transaction.

CREATE TEMP TABLE "_tally_before" ON COMMIT DROP AS
SELECT b."electionId", c."positionId", c."candidateId", c."approve", COUNT(*) AS n
FROM "election_vote_choices" c
JOIN "election_ballots" b ON b."id" = c."ballotId"
GROUP BY 1, 2, 3, 4;

CREATE TEMP TABLE "_papers_before" ON COMMIT DROP AS
SELECT "electionId", COUNT(*) AS n FROM "election_ballots" GROUP BY 1;

UPDATE "election_ballots" SET "id" = gen_random_uuid()::text WHERE "id" NOT LIKE '%-%';
UPDATE "election_vote_choices" SET "id" = gen_random_uuid()::text WHERE "id" NOT LIKE '%-%';

DO $$
BEGIN
  IF EXISTS (
    (SELECT b."electionId", c."positionId", c."candidateId", c."approve", COUNT(*) AS n
       FROM "election_vote_choices" c JOIN "election_ballots" b ON b."id" = c."ballotId"
       GROUP BY 1, 2, 3, 4
     EXCEPT SELECT * FROM "_tally_before")
    UNION ALL
    (SELECT * FROM "_tally_before"
     EXCEPT SELECT b."electionId", c."positionId", c."candidateId", c."approve", COUNT(*) AS n
       FROM "election_vote_choices" c JOIN "election_ballots" b ON b."id" = c."ballotId"
       GROUP BY 1, 2, 3, 4)
  ) THEN
    RAISE EXCEPTION 'Election tallies changed while replacing ballot ids; nothing was changed.';
  END IF;
  IF EXISTS (
    (SELECT "electionId", COUNT(*) AS n FROM "election_ballots" GROUP BY 1 EXCEPT SELECT * FROM "_papers_before")
    UNION ALL
    (SELECT * FROM "_papers_before" EXCEPT SELECT "electionId", COUNT(*) AS n FROM "election_ballots" GROUP BY 1)
  ) THEN
    RAISE EXCEPTION 'The number of ballot papers changed while replacing ballot ids; nothing was changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM "election_ballots" WHERE "id" NOT LIKE '%-%')
     OR EXISTS (SELECT 1 FROM "election_vote_choices" WHERE "id" NOT LIKE '%-%') THEN
    RAISE EXCEPTION 'Some ballot ids were not replaced; nothing was changed.';
  END IF;
END $$;

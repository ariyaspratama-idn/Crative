DROP INDEX `LoginChallenge_waNumber_key` ON `LoginChallenge`;

CREATE INDEX `LoginChallenge_waNumber_expiresAt_idx`
  ON `LoginChallenge` (`waNumber`, `expiresAt`);

ALTER TABLE `Session`
  ADD COLUMN `verifiedAt` DATETIME(3) NULL;

CREATE TABLE `LoginChallenge` (
  `id` VARCHAR(191) NOT NULL,
  `waNumber` VARCHAR(15) NOT NULL,
  `codeHash` CHAR(64) NOT NULL,
  `consentPromo` BOOLEAN NOT NULL DEFAULT false,
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `consumedAt` DATETIME(3) NULL,
  UNIQUE INDEX `LoginChallenge_waNumber_key` (`waNumber`),
  UNIQUE INDEX `LoginChallenge_codeHash_key` (`codeHash`),
  INDEX `LoginChallenge_expiresAt_idx` (`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ClaimReceiptFingerprint` (
  `imageHash` CHAR(64) NOT NULL,
  `claimId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ClaimReceiptFingerprint_claimId_key` (`claimId`),
  PRIMARY KEY (`imageHash`),
  CONSTRAINT `ClaimReceiptFingerprint_claimId_fkey`
    FOREIGN KEY (`claimId`) REFERENCES `Claim` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `ClaimReceiptFingerprint` (`imageHash`, `claimId`, `createdAt`)
SELECT `imageHash`, MIN(`id`), CURRENT_TIMESTAMP(3)
FROM `Claim`
WHERE `imageHash` IS NOT NULL AND `status` <> 'REJECTED'
GROUP BY `imageHash`;

UPDATE `Reward`
SET `expiresAt` = DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY)
WHERE `status` = 'AVAILABLE' AND `expiresAt` IS NULL;

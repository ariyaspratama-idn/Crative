CREATE TABLE `Setting` (
  `key` VARCHAR(100) NOT NULL,
  `value` JSON NOT NULL,
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

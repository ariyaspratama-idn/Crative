ALTER TABLE `WebOrder`
    ADD COLUMN `discount` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `WebOrder`
    ADD COLUMN `rewardId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `WebOrder_rewardId_key`
    ON `WebOrder`(`rewardId`);

ALTER TABLE `WebOrderItem`
    ADD COLUMN `isReward` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `WebOrder`
    ADD CONSTRAINT `WebOrder_rewardId_fkey`
    FOREIGN KEY (`rewardId`) REFERENCES `Reward`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

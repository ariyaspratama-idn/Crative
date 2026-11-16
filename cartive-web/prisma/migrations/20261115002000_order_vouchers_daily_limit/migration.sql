ALTER TABLE `WebOrder`
    ADD COLUMN `discount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `rewardId` VARCHAR(191) NULL,
    ADD UNIQUE INDEX `WebOrder_rewardId_key`(`rewardId`);

ALTER TABLE `WebOrderItem`
    ADD COLUMN `isReward` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `WebOrder`
    ADD CONSTRAINT `WebOrder_rewardId_fkey`
    FOREIGN KEY (`rewardId`) REFERENCES `Reward`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

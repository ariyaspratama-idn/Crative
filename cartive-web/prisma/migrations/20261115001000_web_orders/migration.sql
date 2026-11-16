CREATE TABLE `WebOrder` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `status` ENUM('AWAITING_QUOTE', 'AWAITING_PAYMENT', 'PAYMENT_REVIEW', 'PAID', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'AWAITING_PAYMENT',
    `fulfillment` ENUM('PICKUP', 'DELIVERY') NOT NULL,
    `deliveryAddress` VARCHAR(400) NULL,
    `note` VARCHAR(250) NULL,
    `subtotal` INTEGER NOT NULL,
    `deliveryFee` INTEGER NULL,
    `total` INTEGER NULL,
    `paymentProofKey` VARCHAR(191) NULL,
    `paymentProofHash` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `statusUpdatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WebOrder_code_key`(`code`),
    INDEX `WebOrder_memberId_createdAt_idx`(`memberId`, `createdAt`),
    INDEX `WebOrder_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `WebOrder_paymentProofHash_idx`(`paymentProofHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WebOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(40) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` INTEGER NOT NULL,

    INDEX `WebOrderItem_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProductBatch` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(40) NOT NULL,
    `batchCode` VARCHAR(80) NOT NULL,
    `quantityProduced` INTEGER NOT NULL,
    `quantityAvailable` INTEGER NOT NULL,
    `bestBeforeAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProductBatch_productId_batchCode_key`(`productId`, `batchCode`),
    INDEX `ProductBatch_productId_isActive_bestBeforeAt_idx`(`productId`, `isActive`, `bestBeforeAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OrderBatchAllocation` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderBatchAllocation_orderId_idx`(`orderId`),
    INDEX `OrderBatchAllocation_batchId_idx`(`batchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WebOrder` ADD CONSTRAINT `WebOrder_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `Member`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `WebOrderItem` ADD CONSTRAINT `WebOrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `WebOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `OrderBatchAllocation` ADD CONSTRAINT `OrderBatchAllocation_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `WebOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `OrderBatchAllocation` ADD CONSTRAINT `OrderBatchAllocation_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `ProductBatch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

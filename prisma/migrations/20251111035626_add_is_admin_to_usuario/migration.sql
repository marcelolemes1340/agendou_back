/*
  Warnings:

  - You are about to drop the column `tipo` on the `Usuario` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "tipo",
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "servico" TEXT NOT NULL,
    "profissional" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

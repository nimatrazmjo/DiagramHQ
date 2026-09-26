-- AddForeignKey
ALTER TABLE "architectures" ADD CONSTRAINT "architectures_default_version_id_fkey" FOREIGN KEY ("default_version_id") REFERENCES "versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

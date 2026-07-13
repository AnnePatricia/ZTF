-- Modifier la contrainte de clé étrangère
ALTER TABLE cleaning_tasks
DROP CONSTRAINT IF EXISTS cleaning_tasks_source_task_id_fkey;

ALTER TABLE cleaning_tasks
ADD CONSTRAINT cleaning_tasks_source_task_id_fkey
FOREIGN KEY (source_task_id)
REFERENCES transcription_tasks(id)
ON DELETE CASCADE;
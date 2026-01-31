
-- Tarea: Añadir columna default_budget a la tabla categories para "UX: Presupuesto por defecto"

alter table categories 
add column if not exists default_budget numeric default 0;

-- Opcional: asegurar que sea positivo
alter table categories 
add constraint categories_default_budget_check check (default_budget >= 0);

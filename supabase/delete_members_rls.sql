
-- Permitir a los admins eliminar miembros de su mismo hogar, 
-- SIEMPRE Y CUANDO el miembro a eliminar NO sea admin.
-- (Evita que un admin elimine a otro admin, o se elimine a sí mismo y deje el hogar sin admin)

create policy "Admins can delete non-admin members"
on household_members
for delete
using (
  -- El rol del usuario que ejecuta la acción debe ser 'admin' en este hogar
  (select role from household_members where user_id = auth.uid() and household_id = household_members.household_id) = 'admin'
  
  -- Y el rol del miembro que se está borrando (la fila actual) NO debe ser 'admin'
  and role <> 'admin'
);

begin;

grant usage on schema public to service_role;
grant usage on schema extensions to service_role;

grant select, insert, update, delete
on all tables in schema public
to service_role;

commit;

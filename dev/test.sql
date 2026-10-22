-- Проверка логики базы от лица сайта (роль anon). Запуск: psql -d domashki_dev -f dev/test.sql
-- Перед запуском: schema.sql и пароль администратора 'testpass1' (см. dev/README.md).
\set ON_ERROR_STOP 0
\pset tuples_only on
set role anon;

\echo '--- администратор'
select public.admin_login('testpass1') as admin_ok;
select public.admin_generate_codes('testpass1', 2)::text as new_codes;
select public.admin_save_settings('testpass1', '["Алматы","Астана"]', '["Кредит","Депозит"]',
  jsonb_build_object('3', (now() - interval '1 day')::text))::text as settings;

reset role;
select code as c1 from participants order by created_at, code limit 1 \gset
select code as c2 from participants order by created_at, code offset 1 limit 1 \gset
select public._file_prefix(:'c1') as p1, public._file_prefix(:'c2') as p2 \gset
set role anon;

\echo '--- вход (регистр и дефисы не важны), чужой код'
select public.login(lower(:'c1'))->>'code' = :'c1' as login_ok;
select public.login('XXXX-XXXX');

\echo '--- урок 1: только текст'
select public.save_answer(:'c1', 1, 'Алматы', '{Кредит}', 'Ответ на урок 1')->>'lesson_id' as saved_l1;
select public.save_answer(:'c1', 1, 'Алматы', '{Кредит}', 'x', jsonb_build_object('path', :'p1' || '/a.pdf'));

\echo '--- проверки: филиал, продукт, пустой ответ, срок, чужая папка файла'
select public.save_answer(:'c1', 2, 'Караганда', '{Кредит}', 'x');
select public.save_answer(:'c1', 2, 'Алматы', '{Ипотека}', 'x');
select public.save_answer(:'c1', 2, 'Алматы', '{}', 'x');
select public.save_answer(:'c1', 2, 'Алматы', '{Кредит}', '   ');
select public.save_answer(:'c1', 3, 'Алматы', '{Кредит}', 'после срока');
select public.save_answer(:'c1', 2, 'Алматы', '{Кредит}', 'x', '{"path":"deadbeef/a.pdf"}');

\echo '--- урок 2: файл, потом правка текста с сохранением файла, потом удаление файла'
select public.save_answer(:'c1', 2, 'Астана', '{Кредит,Депозит}', '',
  jsonb_build_object('path', :'p1' || '/f1.pdf', 'name', 'Ответ.pdf', 'type', 'application/pdf'))->>'file_name' as with_file;
select public.save_answer(:'c1', 2, 'Астана', '{Депозит}', 'Добавил текст')->>'file_name' as file_kept;
select public.save_answer(:'c1', 2, 'Астана', '{Депозит}', 'Только текст', null, true)->>'file_name' is null as file_removed;

\echo '--- второй участник видит ответы без кода автора'
select jsonb_array_length(public.list_answers(:'c2')) as visible, public.list_answers(:'c2')::text like '%' || :'c1' || '%' as code_leaked;
select (select count(*) from jsonb_array_elements(public.list_answers(:'c1')) e where (e->>'is_mine')::boolean) as mine_for_c1;

\echo '--- удаление, блокировка кода, выгрузка'
select public.delete_answer(:'c1', 1);
select jsonb_array_length(public.admin_answers('testpass1')) as total_after_delete;
select public.admin_set_active('testpass1', :'c2', false);
select public.list_answers(:'c2');
select public.is_upload_prefix(:'p1') as upload_ok, not public.is_upload_prefix(:'p2') as blocked_code_cannot_upload;

\echo '--- прямой доступ к таблицам закрыт'
select count(*) from answers;
reset role;

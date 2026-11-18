\set ON_ERROR_STOP 1
insert into auth.users(id,email,raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','a@x.com','{"full_name":"Student A"}'),
 ('22222222-2222-2222-2222-222222222222','b@x.com','{"full_name":"Student B"}');
select id, full_name from public.profiles order by full_name;   -- trigger created both profiles

set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
insert into semesters(number,is_current) values (1,false),(2,true);
insert into subjects(semester_id,name,credits,marks_obtained,max_marks,classes_attended,classes_total)
  select id,'Maths',4,72,100,30,40 from semesters where number=2;
select 'A sees own subjects' t, count(*) from subjects;

select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select 'B sees A subjects (expect 0)' t, count(*) from subjects;
select 'B sees A profile (expect 1 = own)' t, count(*) from profiles;
update subjects set marks_obtained = 0;   -- affects 0 rows under RLS
\set ON_ERROR_STOP 0
-- B tries to attach a subject to A's semester -> must fail
insert into subjects(semester_id,name) select id,'Hack' from semesters limit 1;
insert into subjects(user_id,semester_id,name) values ('11111111-1111-1111-1111-111111111111', gen_random_uuid(),'Hack2');
\set ON_ERROR_STOP 1
reset role;
select 'A marks unchanged (expect 72)' t, marks_obtained from subjects;
-- rate limiter: authenticated must NOT be able to call it
set role authenticated;
\set ON_ERROR_STOP 0
select hit_rate_limit('x',2,60);
\set ON_ERROR_STOP 1
set role service_role;
select hit_rate_limit('chat:a',2,60) a, hit_rate_limit('chat:a',2,60) b, hit_rate_limit('chat:a',2,60) c_expect_false;
reset role;
-- cascade delete
delete from auth.users where email='a@x.com';
select 'after delete A rows (expect 0)' t, (select count(*) from subjects)+(select count(*) from semesters where user_id='11111111-1111-1111-1111-111111111111') n;
select id, public, file_size_limit from storage.buckets;

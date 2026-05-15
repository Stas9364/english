


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."block_type" AS ENUM (
    'text',
    'image'
);


ALTER TYPE "public"."block_type" OWNER TO "postgres";


CREATE TYPE "public"."test_type" AS ENUM (
    'single',
    'multiple',
    'input',
    'select_gaps',
    'matching'
);


ALTER TYPE "public"."test_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from public.admin_emails
    where email = auth.jwt() ->> 'email'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_emails" (
    "email" "text" NOT NULL
);


ALTER TABLE "public"."admin_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chapters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chapters" OWNER TO "postgres";


COMMENT ON TABLE "public"."chapters" IS 'Reusable chapter taxonomy across entity types';



COMMENT ON COLUMN "public"."chapters"."key" IS 'Stable URL-safe chapter key';



CREATE TABLE IF NOT EXISTS "public"."options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "gap_index" integer
);


ALTER TABLE "public"."options" OWNER TO "postgres";


COMMENT ON COLUMN "public"."options"."gap_index" IS 'For input type: 0-based gap index. Null or 0 = first/single gap.';



CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page_id" "uuid" NOT NULL,
    "question_title" "text" NOT NULL,
    "explanation" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "question_image_url" "text"
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."questions"."question_image_url" IS 'Optional public URL for question image (stored in Storage folder questions/)';



CREATE TABLE IF NOT EXISTS "public"."quiz_listenings_meta" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quiz_listenings_meta" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "type" "public"."test_type" NOT NULL,
    "title" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "example" "text"
);


ALTER TABLE "public"."quiz_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "topic_id" "uuid" NOT NULL
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."theory_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "type" "public"."block_type" NOT NULL,
    "content" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."theory_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "chapter" "text" DEFAULT 'grammar'::"text" NOT NULL,
    "chapter_id" "uuid"
);


ALTER TABLE "public"."topics" OWNER TO "postgres";


COMMENT ON COLUMN "public"."topics"."chapter" IS 'Admin section key, e.g. grammar, vocabulary';



ALTER TABLE ONLY "public"."admin_emails"
    ADD CONSTRAINT "admin_emails_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."options"
    ADD CONSTRAINT "options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_listenings_meta"
    ADD CONSTRAINT "quiz_listenings_meta_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_pages"
    ADD CONSTRAINT "quiz_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."theory_blocks"
    ADD CONSTRAINT "theory_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_slug_key" UNIQUE ("slug");



CREATE INDEX "options_question_id_idx" ON "public"."options" USING "btree" ("question_id");



CREATE INDEX "questions_page_id_idx" ON "public"."questions" USING "btree" ("page_id");



CREATE INDEX "quiz_listenings_meta_quiz_id_idx" ON "public"."quiz_listenings_meta" USING "btree" ("quiz_id");



CREATE INDEX "quiz_pages_quiz_id_idx" ON "public"."quiz_pages" USING "btree" ("quiz_id");



CREATE INDEX "quizzes_topic_id_idx" ON "public"."quizzes" USING "btree" ("topic_id");



CREATE INDEX "quizzes_topic_id_title_idx" ON "public"."quizzes" USING "btree" ("topic_id", "title");



CREATE INDEX "theory_blocks_quiz_id_idx" ON "public"."theory_blocks" USING "btree" ("quiz_id");



CREATE INDEX "topics_chapter_id_order_idx" ON "public"."topics" USING "btree" ("chapter_id", "order_index");



CREATE INDEX "topics_chapter_order_idx" ON "public"."topics" USING "btree" ("chapter", "order_index");



CREATE INDEX "topics_name_idx" ON "public"."topics" USING "btree" ("name");



CREATE INDEX "topics_order_index_idx" ON "public"."topics" USING "btree" ("order_index");



ALTER TABLE ONLY "public"."options"
    ADD CONSTRAINT "options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."quiz_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_listenings_meta"
    ADD CONSTRAINT "quiz_listenings_meta_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_pages"
    ADD CONSTRAINT "quiz_pages_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."theory_blocks"
    ADD CONSTRAINT "theory_blocks_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE RESTRICT;



ALTER TABLE "public"."admin_emails" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_emails_select" ON "public"."admin_emails" FOR SELECT USING ("public"."is_admin"());



ALTER TABLE "public"."chapters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chapters_delete" ON "public"."chapters" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "chapters_insert" ON "public"."chapters" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "chapters_select" ON "public"."chapters" FOR SELECT USING (true);



CREATE POLICY "chapters_update" ON "public"."chapters" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "options_delete" ON "public"."options" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "options_insert" ON "public"."options" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "options_select" ON "public"."options" FOR SELECT USING (true);



CREATE POLICY "options_update" ON "public"."options" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_delete" ON "public"."questions" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "questions_insert" ON "public"."questions" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "questions_select" ON "public"."questions" FOR SELECT USING (true);



CREATE POLICY "questions_update" ON "public"."questions" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."quiz_listenings_meta" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_listenings_meta_delete" ON "public"."quiz_listenings_meta" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "quiz_listenings_meta_insert" ON "public"."quiz_listenings_meta" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "quiz_listenings_meta_select" ON "public"."quiz_listenings_meta" FOR SELECT USING (true);



CREATE POLICY "quiz_listenings_meta_update" ON "public"."quiz_listenings_meta" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."quiz_pages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_pages_delete" ON "public"."quiz_pages" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "quiz_pages_insert" ON "public"."quiz_pages" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "quiz_pages_select" ON "public"."quiz_pages" FOR SELECT USING (true);



CREATE POLICY "quiz_pages_update" ON "public"."quiz_pages" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."quizzes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quizzes_delete" ON "public"."quizzes" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "quizzes_insert" ON "public"."quizzes" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "quizzes_select" ON "public"."quizzes" FOR SELECT USING (true);



CREATE POLICY "quizzes_update" ON "public"."quizzes" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."theory_blocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "theory_blocks_delete" ON "public"."theory_blocks" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "theory_blocks_insert" ON "public"."theory_blocks" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "theory_blocks_select" ON "public"."theory_blocks" FOR SELECT USING (true);



CREATE POLICY "theory_blocks_update" ON "public"."theory_blocks" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topics_delete" ON "public"."topics" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "topics_insert" ON "public"."topics" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "topics_select" ON "public"."topics" FOR SELECT USING (true);



CREATE POLICY "topics_update" ON "public"."topics" FOR UPDATE USING ("public"."is_admin"());





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";


















GRANT ALL ON TABLE "public"."admin_emails" TO "anon";
GRANT ALL ON TABLE "public"."admin_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_emails" TO "service_role";



GRANT ALL ON TABLE "public"."chapters" TO "anon";
GRANT ALL ON TABLE "public"."chapters" TO "authenticated";
GRANT ALL ON TABLE "public"."chapters" TO "service_role";



GRANT ALL ON TABLE "public"."options" TO "anon";
GRANT ALL ON TABLE "public"."options" TO "authenticated";
GRANT ALL ON TABLE "public"."options" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_listenings_meta" TO "anon";
GRANT ALL ON TABLE "public"."quiz_listenings_meta" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_listenings_meta" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_pages" TO "anon";
GRANT ALL ON TABLE "public"."quiz_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_pages" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."theory_blocks" TO "anon";
GRANT ALL ON TABLE "public"."theory_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."theory_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."topics" TO "anon";
GRANT ALL ON TABLE "public"."topics" TO "authenticated";
GRANT ALL ON TABLE "public"."topics" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































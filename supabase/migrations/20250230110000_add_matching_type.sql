-- Добавляем тип страницы: соответствие (matching) — перетаскивание элементов слева к вопросам справа
alter type public.test_type add value if not exists 'matching';

-- Добавляем тип страницы: выбор варианта из списка в каждом пропуске [[]]
alter type public.test_type add value if not exists 'select_gaps';

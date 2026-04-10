"use server";

import Link from "next/link";
import { GuideToc } from "@/components/guide-toc";

export default async function AdminGuidePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header className="space-y-1">
        <Link
          href="/admin"
          className="text-base block text-primary underline-offset-4 hover:underline mb-4"
        >
          ← Назад
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Создание квизов и страниц с ответами</h1>
        <p className="text-base text-muted-foreground">
          Пошаговое руководство: как устроен квиз, как добавлять страницы, теорию и настраивать ответы.
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
        <GuideToc />
        <main className="min-w-0 space-y-8 mt-6 lg:mt-0">

      <section id="how-quiz-works" className="space-y-3 scroll-mt-6">
        <h2 className="text-xl font-semibold">Как устроен квиз</h2>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            <strong>Квиз</strong> — это один тест (например, «Present Simple»).
          </li>
          <li>
            У квиза есть <strong>название</strong> и <strong>описание</strong> (описание показывается пользователю в начале).
          </li>
          <li>
            Квиз может содержать <strong>теорию</strong> — блоки текста и/или изображений, которые отображаются пользователю во
            вкладке «Theory» до или во время прохождения теста.
          </li>
          <li>
            Квиз состоит из <strong>страниц</strong>. Каждая страница — это один экран с заданиями.
          </li>
          <li>
            На каждой странице задаётся <strong>тип ответа</strong>: один вариант, несколько вариантов, ввод текста, выбор в
            пропусках (dropdown) или соответствие (matching).
          </li>
          <li>
            Внутри страницы — <strong>вопросы</strong>. У каждого вопроса свой текст и свои варианты ответов (или список
            правильных фраз, или пары для соответствия).
          </li>
        </ul>
        <p className="text-base text-muted-foreground">
          Схема: <strong>Квиз → (опционально) Теория + Страницы → У каждой страницы тип + вопросы → У каждого вопроса варианты /
          правильные ответы / пары</strong>.
        </p>
      </section>

      <section id="ai-generation" className="space-y-3 scroll-mt-6">
        <h2 className="text-xl font-semibold">Автогенерация страниц (AI generation)</h2>
        <p className="text-base">
          В админке ниже полей квиза есть блок <strong>AI generation (Gemini)</strong>. Он умеет по заданным параметрам
          автоматически создавать одну страницу квиза и сразу вставлять её в форму.
        </p>

        <h3 className="text-lg font-semibold">Как пользоваться базовым режимом (без custom task)</h3>
        <ol className="list-decimal space-y-1 pl-5 text-base">
          <li>
            Заполните <strong>Topic</strong> (обязательно) — кратко опишите тему, например «Present Simple daily routine».
          </li>
          <li>
            Укажите <strong>Level</strong> (например, B1) и <strong>Explanation language</strong> (RU/EN) — это подсказки для
            уровня сложности и языка комментариев.
          </li>
          <li>
            В блоке <strong>Pages per request / Questions per page / Page type to generate</strong>:
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                <em>Pages per request</em> всегда = 1 (генерируется одна страница за раз).
              </li>
              <li>
                В <strong>Questions per page</strong> задайте целое число вопросов на странице (например, 5).
              </li>
              <li>
                В <strong>Page type to generate</strong> выберите нужный тип: <em>single</em>, <em>multiple</em>, <em>input</em>,{" "}
                <em>select_gaps</em>, <em>matching</em>.
              </li>
            </ul>
          </li>
          <li>
            При необходимости задайте:
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                <strong>Style (optional)</strong> — стиль заданий (короткие предложения, диалоговый формат и т.п.).
              </li>
              <li>
                <strong>Constraints (optional)</strong> — ограничения (без имён собственных, без чисел, использовать только
                Present Simple и т.п.).
              </li>
              <li>
                <strong>Lexis (optional)</strong> — слова/темы, которые обязательно должны встретиться.
              </li>
              <li>
                <strong>Forbidden topics (optional)</strong> — темы, которых нужно избегать.
              </li>
            </ul>
          </li>
          <li>
            Нажмите <strong>Generate page</strong>:
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>если форма ещё пустая (одна дефолтная страница) — она будет заменена;</li>
              <li>если страница уже есть или это не первая генерация — новая страница добавится в конец.</li>
            </ul>
          </li>
          <li>
            После генерации <strong>обязательно проверьте</strong> вопросы и варианты перед сохранением квиза — при необходимости
            отредактируйте их вручную.
          </li>
        </ol>

        <h3 className="text-lg font-semibold">Как пользоваться режимом с собственным заданием (Custom task)</h3>
        <p className="text-base">
          Иногда нужно взять уже подготовленное задание (например, текст из учебника) и просто «упаковать» его в формат страницы
          квиза выбранного типа. Для этого используется поле <strong>Custom task (optional)</strong> в блоке AI generation.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-base">
          <li>
            Заполните поля:
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                <strong>Topic</strong> — для контекста (название грамматической темы / лексики).
              </li>
              <li>
                <strong>Page type to generate</strong> — тот тип страницы, в который нужно превратить задание (
                <em>single</em> / <em>multiple</em> / <em>input</em> / <em>select_gaps</em> / <em>matching</em>).
              </li>
              <li>Остальные поля (Level, Style и т.п.) по желанию.</li>
            </ul>
          </li>
          <li>
            В поле <strong>Custom task (optional)</strong> вставьте своё задание:
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>это может быть текст инструкции и примеры вопросов;</li>
              <li>
                Gemini воспринимает этот текст как <strong>канонический</strong> — он не должен перефразировать или придумывать
                новые вопросы, только разложить их по схеме (question_title / options / правильные ответы).
              </li>
            </ul>
          </li>
          <li>
            Нажмите <strong>Generate page</strong>:
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                сервер передаст custom task в промпт как <em>Primary instruction (highest priority)</em>;
              </li>
              <li>
                если custom task описывает один вопрос, будет создана страница с одним вопросом (кол-во вопросов{" "}
                <strong>не подгоняется</strong> под <em>Questions per page</em>);
              </li>
              <li>
                все страницы будут выбранного в блоке <strong>Page type to generate</strong> типа (например, только matching).
              </li>
            </ul>
          </li>
          <li>
            Если при генерации возникает ошибка:
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>проверьте, что ваш текст можно однозначно разбить на вопросы и варианты ответов;</li>
              <li>
                при необходимости немного адаптируйте задание (добавьте явные номера, маркеры вариантов и т.п.), но сохраняйте его
                смысл — Gemini использует текст <strong>как есть</strong>.
              </li>
            </ul>
          </li>
        </ol>

        <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-xs">
          <p className="font-medium">Рекомендуется:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              Для <strong>matching</strong> давать в custom task предложения или фразы с контекстом (а не одиночные слова), чтобы
              каждая пара «вопрос — ответ» была однозначной.
            </li>
            <li>
              Для <strong>input</strong>/<strong>select_gaps</strong> явно указывать, где должны быть пропуски, и какие варианты
              считаются правильными.
            </li>
          </ul>
        </div>
      </section>

      <section id="create-quiz" className="space-y-3 scroll-mt-6">
        <h2 className="text-xl font-semibold">Создание нового квиза</h2>

        <h3 className="text-lg font-semibold">Шаг 1. Основные поля</h3>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            <strong>Quiz title</strong> (обязательно) — название квиза, например «Present Simple». Оно отображается на главной и в
            начале теста.
          </li>
          <li>
            <strong>Description (optional)</strong> — краткое описание или инструкция. Показывается пользователю перед началом и
            при необходимости на странице.
          </li>
        </ul>

        <h3 className="text-lg font-semibold">Шаг 2. Страницы</h3>
        <p className="text-base">
          Под полями квиза идёт блок <strong>Pages</strong>.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            У каждой страницы есть карточка <strong>Page 1</strong>, <strong>Page 2</strong> и т.д.
          </li>
          <li>
            Страниц должно быть <strong>хотя бы одна</strong>. Добавление новой страницы — кнопка <strong>Add page</strong> внизу
            блока «Pages».
          </li>
        </ul>
        <p className="text-base">В каждой карточке страницы настраивается:</p>
        <ol className="list-decimal space-y-1 pl-5 text-base">
          <li>
            <strong>Page type</strong> — тип ответов на этой странице:
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                <strong>Single choice</strong> — один правильный вариант (радиокнопки).
              </li>
              <li>
                <strong>Multiple choice</strong> — несколько правильных вариантов (чекбоксы).
              </li>
              <li>
                <strong>Text input</strong> — пользователь вводит текст в пропуски в предложении; правильность по списку
                допустимых ответов для каждого пропуска.
              </li>
              <li>
                <strong>Dropdown in gaps</strong> — в предложении есть пропуски <code>[[]]</code>; в каждом пропуске пользователь
                выбирает один вариант из выпадающего списка; вы отмечаете, какой вариант правильный для каждого пропуска.
              </li>
              <li>
                <strong>Matching</strong> — слева перетаскиваемые элементы, справа вопросы; пользователь сопоставляет каждый
                элемент слева с вопросом справа (drag and drop).
              </li>
            </ul>
          </li>
          <li>
            <strong>Page title (optional)</strong> — подзаголовок страницы, если нужен.
          </li>
          <li>
            <strong>Example (optional)</strong> — образец выполнения задания, который показывается пользователю на этой странице.
            Удобно, когда нужно наглядно показать, как отвечать: например, «I usually get up at 7 a.m.» для страницы с
            составлением предложений.
          </li>
          <li>
            <strong>Questions</strong> — список вопросов на этой странице (см. ниже).
          </li>
        </ol>
        <p className="text-base">
          В правом верхнем углу карточки страницы расположены кнопки <strong>↑</strong> и <strong>↓</strong> — они меняют порядок
          страниц в квизе. Кнопка <strong>↑</strong> недоступна для первой страницы, <strong>↓</strong> — для последней. Новый
          порядок применяется сразу в форме и сохраняется при нажатии <strong>Create quiz</strong> /{" "}
          <strong>Save changes</strong>.
        </p>
        <p className="text-xs text-muted-foreground">
          Иконка корзины рядом с заголовком страницы удаляет страницу сразу после подтверждения (запись удаляется в БД). Удалить
          можно только если страниц больше одной.
        </p>

        <h3 className="text-lg font-semibold">Шаг 3. Вопросы внутри страницы</h3>
        <p className="text-base">
          Внутри каждой страницы — блок <strong>Questions</strong>.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            Вопросов на странице должно быть <strong>хотя бы один</strong>.
          </li>
          <li>
            Новый вопрос — кнопка <strong>Add question</strong> внизу блока вопросов этой страницы.
          </li>
        </ul>
        <p className="text-base">У каждого вопроса заполняете:</p>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            <strong>Question text</strong> (обязательно) — текст вопроса, например «Choose the correct form». Для{" "}
            <strong>Text input</strong> без <code>[[]]</code> будет одно поле для ответа; с <code>[[]]</code> — несколько полей в
            местах пропусков. Для <strong>Dropdown in gaps</strong> в тексте обязательно указывайте <code>[[]]</code> в местах
            выпадающих списков.
          </li>
          <li>
            <strong>Explanation (optional)</strong> — пояснение, которое показывается пользователю после проверки ответа.
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Иконка корзины рядом с «Question 1», «Question 2» удаляет вопрос сразу после подтверждения. Удалить можно только если
          вопросов больше одного.
        </p>

        <h3 className="text-lg font-semibold">Шаг 4. Варианты ответов (Single choice и Multiple choice)</h3>
        <p className="text-base">
          Если у страницы тип <strong>Single choice</strong> или <strong>Multiple choice</strong>, у каждого вопроса есть блок{" "}
          <strong>Options</strong>.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            Каждый вариант — это поле с текстом и чекбокс <strong>Correct</strong>.
          </li>
          <li>
            <strong>Single choice</strong>: отметьте <strong>Correct</strong> только у одного варианта — это и будет правильный
            ответ.
          </li>
          <li>
            <strong>Multiple choice</strong>: отметьте <strong>Correct</strong> у всех вариантов, которые считаются правильными;
            пользователь должен выбрать все правильные.
          </li>
          <li>
            Кнопка <strong>Add option</strong> внизу списка вариантов добавляет новый вариант. Иконка корзины рядом с вариантом
            удаляет его сразу после подтверждения. Вариантов должно остаться <strong>минимум один</strong>.
          </li>
          <li>У каждого вопроса свой набор вариантов; они не связаны с другими вопросами.</li>
        </ul>

        <h3 className="text-lg font-semibold">Шаг 5. Правильные ответы для Text input</h3>
        <p className="text-base">
          Если у страницы тип <strong>Text input</strong>, у каждого вопроса вместо вариантов выбора настраивается список
          допустимых ответов. <strong>Сколько раз в тексте вопроса встречается маркер</strong> <code>[[]]</code>
          <strong>, столько на экране квиза будет отдельных полей ввода</strong> (пропусков). Если{" "}
          <code>[[]]</code> <strong>нет</strong>, считается <strong>одно</strong> общее поле ввода под целым вопросом — как если
          бы был один пропуск.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-base">
            <thead>
              <tr>
                <th className="border px-2 py-1 font-semibold">Маркеров [[]] в тексте</th>
                <th className="border px-2 py-1 font-semibold">Ученик видит</th>
                <th className="border px-2 py-1 font-semibold">В админке (подписи блоков)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-2 py-1">
                  <strong>0</strong> (нет <code>[[]]</code>)
                </td>
                <td className="border px-2 py-1">
                  Одно поле «снизу» под формулировкой вопроса (например: «Переведите: яблоко» → ввод «apple»).
                </td>
                <td className="border px-2 py-1">
                  Один блок с подписью <strong>Correct answers (any match counts)</strong> — все строки относятся к этому единственному
                  ответу; засчитывается любое совпадение с одной из них (без учёта регистра).
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1">
                  <strong>1</strong>
                </td>
                <td className="border px-2 py-1">
                  Одно поле <strong>вместо</strong> единственного <code>[[]]</code> в предложении (например: «She [[]] to school every
                  day.»).
                </td>
                <td className="border px-2 py-1">
                  Как при нуле маркеров: снова один блок{" "}
                  <strong>Correct answers (any match counts)</strong> — список допустимых форм для этого пропуска (например «goes»,
                  «does go»).
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1">
                  <strong>2 и больше</strong>
                </td>
                <td className="border px-2 py-1">
                  Столько полей ввода, сколько <code>[[]]</code>, слева направо в тексте (например два пропуска: «The cat [[]] on the
                  [[]].»).
                </td>
                <td className="border px-2 py-1">
                  Отдельные блоки <strong>Correct answers for gap 1</strong>, <strong>Correct answers for gap 2</strong> и т.д. — для
                  каждого пропуска свой список фраз. Первое поле ученика сверяется с gap 1, второе — с gap 2 и т.д.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-base text-muted-foreground">
          Важно: <strong>один</strong> <code>[[]]</code> и <strong>отсутствие</strong> <code>[[]]</code> с точки зрения формы
          ведут себя одинаково — одно поле у ученика и один блок правильных ответов. Разница только в том, показывается ли поле
          встроенным в предложение или отдельной строкой под текстом.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            Кнопка <strong>Add correct answer</strong> добавляет ещё одну допустимую фразу в текущий блок; если пропусков{" "}
            <strong>больше одного</strong>, кнопки называются <strong>Add correct answer for gap N</strong>.
          </li>
          <li>
            Иконка корзины удаляет строку после подтверждения. В каждом блоке правильных ответов должен остаться{" "}
            <strong>хотя бы один</strong> вариант.
          </li>
        </ul>

        <h3 className="text-lg font-semibold">Шаг 6. Варианты для Dropdown in gaps</h3>
        <p className="text-base">
          Тип страницы <strong>Dropdown in gaps</strong> подходит, когда нужно вставить в предложение <strong>выбор из списка</strong> вместо
          ввода с клавиатуры: в каждом пропуске пользователь видит выпадающий список и выбирает один вариант.
        </p>
        <p className="text-base font-medium">Как настроить</p>
        <ol className="list-decimal space-y-2 pl-5 text-base">
          <li>
            <strong>Текст вопроса</strong> должен содержать <code>[[]]</code> в тех местах, где должен быть выпадающий список.
            Количество пропусков = количеству <code>[[]]</code>. Пример: «She [[]] to school every day.» — один пропуск; «The cat
            [[]] on the [[]].» — два пропуска.
          </li>
          <li>
            Ниже появятся блоки <strong>Options for gap 1</strong>, <strong>Options for gap 2</strong> и т.д. — по одному на каждый
            пропуск. Порядок блоков совпадает с порядком пропусков слева направо.
          </li>
          <li>
            <strong>В каждом блоке</strong> задаёте варианты, которые будут в выпадающем списке для этого пропуска:
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Поле с текстом варианта (например, «goes», «go», «went»).</li>
              <li>
                Чекбокс <strong>Correct</strong> — отметьте его у всех вариантов, которые считаются правильным ответом для этого
                пропуска (можно несколько: например, «goes» и «go» оба правильные).
              </li>
              <li>
                Кнопка <strong>Add option for gap N</strong> добавляет ещё один вариант в этот пропуск.
              </li>
              <li>
                Иконка корзины удаляет вариант после подтверждения. В каждом пропуске должен остаться{" "}
                <strong>хотя бы один вариант</strong>, и <strong>хотя бы один из них должен быть отмечен как Correct</strong>.
              </li>
            </ul>
          </li>
          <li>
            Варианты для разных пропусков <strong>не смешиваются</strong>: то, что вы добавили в «Options for gap 1», показывается
            только в первом выпадающем списке; в «Options for gap 2» — только во втором и т.д.
          </li>
        </ol>
        <p className="text-base">
          <strong>Пример.</strong> Вопрос: «She [[]] to school. He [[]] to work.»
        </p>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            В <strong>Options for gap 1</strong> добавляете, например: «goes» (Correct), «go» (Correct), «went».
          </li>
          <li>
            В <strong>Options for gap 2</strong> добавляете: «goes» (Correct), «go», «went».
          </li>
        </ul>
        <p className="text-base">
          В квизе пользователь в первом пропуске выберет из первого списка, во втором — из второго; засчитается, если в каждом
          выбран вариант с галочкой Correct.
        </p>

        <h3 className="text-lg font-semibold">Шаг 7. Пары для Matching</h3>
        <p className="text-base">
          Если у страницы тип <strong>Matching</strong>, у каждого вопроса два поля:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            <strong>Right column (question)</strong> — текст, который пользователь увидит справа (цель для сопоставления),
            например «Apple».
          </li>
          <li>
            <strong>Left column (matching item)</strong> — элемент, который пользователь будет перетаскивать к этому вопросу,
            например «яблоко». Это правильная пара для данной строки.
          </li>
        </ul>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            На странице квиза слева отображаются все «элементы слева» (перемешанные), справа — все «вопросы». Пользователь
            перетаскивает элемент к нужному вопросу. После проверки показывается, верно ли сопоставление (зелёный/красный).
          </li>
          <li>
            У каждого вопроса должна быть заполнена <strong>хотя бы одна пара</strong> (текст справа и элемент слева).
          </li>
        </ul>

        <h3 className="text-lg font-semibold">Шаг 8. Теория (опционально)</h3>
        <p className="text-base">
          Блок <strong>Theory (optional)</strong> позволяет добавить к квизу блоки теории до сохранения.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            Кнопки <strong>Text</strong> и <strong>Image</strong> добавляют блок: текстовый или с изображением.
          </li>
          <li>
            <strong>Текст</strong>: введите или вставьте текст в поле (поддерживается разметка).
          </li>
          <li>
            <strong>Изображение</strong>: нажмите <strong>Upload</strong> и выберите файл (JPEG, PNG, GIF, WebP) — он загрузится в
            хранилище и ссылка подставится автоматически; либо вставьте готовый URL в поле.
          </li>
          <li>
            Стрелки вверх/вниз меняют порядок блоков, иконка корзины удаляет блок сразу после подтверждения (для изображений из
            хранилища файл тоже удаляется).
          </li>
          <li>Теорию можно не заполнять при создании и добавить позже в режиме редактирования.</li>
        </ul>

        <h3 className="text-lg font-semibold">Шаг 9. Сохранение</h3>
        <p className="text-base">
          Нажмите <strong>Create quiz</strong>. После успешного сохранения появится сообщение «Quiz created successfully», форма
          очистится, а новый квиз появится в списке <strong>Your quizzes</strong> и на главной странице сайта.
        </p>
      </section>

      <section id="edit-quiz" className="space-y-3 scroll-mt-6">
        <h2 className="text-xl font-semibold">Редактирование квиза</h2>
        <ol className="list-decimal space-y-2 pl-5 text-base">
          <li>
            На странице <code>/admin</code> в блоке <strong>Your quizzes</strong> нажмите иконку карандаша у нужного квиза.
          </li>
          <li>
            Откроется форма редактирования с <strong>двумя вкладками</strong>: <strong>Details and pages</strong> и{" "}
            <strong>Theory</strong>.
          </li>
        </ol>

        <h3 className="text-lg font-semibold">Вкладка «Details and pages»</h3>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>Поля <strong>Quiz title</strong>, <strong>Description</strong>.</li>
          <li>
            Блок <strong>Pages</strong> — как при создании: тип страницы, заголовок, пример, вопросы; для каждого типа — свои
            поля (варианты, правильные ответы для Text input, варианты по пропускам для Dropdown in gaps, пары «справа / слева»
            для Matching).
          </li>
          <li>
            Кнопки <strong>↑</strong> / <strong>↓</strong> в заголовке каждой страницы меняют её порядок в квизе. Изменение
            применяется в форме сразу; сохраняется по нажатию <strong>Save changes</strong>.
          </li>
          <li>
            <strong>Add page</strong> / <strong>Add question</strong> / <strong>Add option</strong> (или{" "}
            <strong>Add correct answer</strong>) — добавление элементов.
          </li>
          <li>
            Иконки корзины удаляют страницу, вопрос или вариант сразу после подтверждения (изменения в БД и, для изображений
            теории, в хранилище применяются немедленно).
          </li>
          <li>
            Кнопка <strong>Save changes</strong> сохраняет изменения в названии, описании, slug, страницах и блоках теории
            (создание и редактирование). Удаления выполняются сразу при подтверждении, отдельно сохранять их не нужно.
          </li>
        </ul>

        <h3 className="text-lg font-semibold">Вкладка «Theory»</h3>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            Блоки теории (текст и изображения), которые видны пользователю во вкладке «Theory» при прохождении квиза.
          </li>
          <li>
            Кнопки <strong>Text</strong> и <strong>Image</strong> добавляют новый блок.
          </li>
          <li>
            <strong>Текст</strong>: поле с текстом (поддерживается разметка).
          </li>
          <li>
            <strong>Изображение</strong>: поле для URL или кнопка <strong>Upload</strong> — загрузка файла в хранилище, ссылка
            подставляется автоматически.
          </li>
          <li>
            Стрелки вверх/вниз меняют порядок блоков. Иконка корзины удаляет блок сразу после подтверждения; если это изображение
            из хранилища, файл там тоже удаляется.
          </li>
          <li>
            Изменения по теории (добавление и правка блоков) сохраняются кнопкой <strong>Save changes</strong> на вкладке{" "}
            <strong>Details and pages</strong>; удаление блоков теории выполняется сразу при подтверждении.
          </li>
        </ul>
      </section>

      <section id="delete-save" className="space-y-3 scroll-mt-6">
        <h2 className="text-xl font-semibold">Удаление и сохранение</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-base">
            <thead>
              <tr>
                <th className="border px-2 py-1 font-semibold">Действие</th>
                <th className="border px-2 py-1 font-semibold">Когда применяется</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-2 py-1">
                  Удаление страницы, вопроса, варианта, блока теории
                </td>
                <td className="border px-2 py-1">
                  <strong>Сразу после подтверждения</strong> в диалоге (запись в БД удаляется; для изображений теории — и файл в
                  хранилище).
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1">
                  Создание и редактирование (тексты, добавление страниц/вопросов/вариантов/блоков теории)
                </td>
                <td className="border px-2 py-1">
                  По нажатию <strong>Save changes</strong> (редактирование) или <strong>Create quiz</strong> (создание).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="cheatsheet" className="space-y-3 scroll-mt-6">
        <h2 className="text-xl font-semibold">Краткая памятка</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-base">
            <thead>
              <tr>
                <th className="border px-2 py-1 font-semibold">Что настраиваете</th>
                <th className="border px-2 py-1 font-semibold">Где</th>
                <th className="border px-2 py-1 font-semibold">Обязательно</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-2 py-1">Название квиза</td>
                <td className="border px-2 py-1">Quiz title</td>
                <td className="border px-2 py-1">Да</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Описание</td>
                <td className="border px-2 py-1">Description</td>
                <td className="border px-2 py-1">Нет</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Теория (текст/изображения)</td>
                <td className="border px-2 py-1">Вкладка Theory / блок Theory (optional)</td>
                <td className="border px-2 py-1">Нет</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Тип ответов на странице</td>
                <td className="border px-2 py-1">
                  Page type: Single / Multiple / Text input / Dropdown in gaps / Matching
                </td>
                <td className="border px-2 py-1">Да</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Заголовок страницы</td>
                <td className="border px-2 py-1">Page title</td>
                <td className="border px-2 py-1">Нет</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Образец для страницы</td>
                <td className="border px-2 py-1">Example (optional)</td>
                <td className="border px-2 py-1">Нет</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Порядок страниц</td>
                <td className="border px-2 py-1">Кнопки ↑ / ↓ в заголовке карточки страницы</td>
                <td className="border px-2 py-1">Нет</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Текст вопроса</td>
                <td className="border px-2 py-1">
                  Question text (для input/dropdown — с <code>[[]]</code> где пропуски)
                </td>
                <td className="border px-2 py-1">Да</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Пояснение после ответа</td>
                <td className="border px-2 py-1">Explanation</td>
                <td className="border px-2 py-1">Нет</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Варианты (single/multiple)</td>
                <td className="border px-2 py-1">Options + Correct</td>
                <td className="border px-2 py-1">
                  Минимум один вариант, хотя бы один Correct
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Допустимые ответы (text input)</td>
                <td className="border px-2 py-1">
                  0–1× <code>[[]]</code>: <strong>Correct answers (any match counts)</strong>; 2+× <code>[[]]</code>:{" "}
                  <strong>Correct answers for gap N</strong>
                </td>
                <td className="border px-2 py-1">
                  Минимум один допустимый вариант на каждый пропуск (на каждый блок)
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Варианты по пропускам (dropdown)</td>
                <td className="border px-2 py-1">Options for gap N + Correct</td>
                <td className="border px-2 py-1">
                  Минимум один вариант и один Correct на пропуск
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Пары (matching)</td>
                <td className="border px-2 py-1">Right column + Left column</td>
                <td className="border px-2 py-1">
                  Одна пара (вопрос справа + элемент слева) на строку
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-base">
          Если при сохранении появляется ошибка — проверьте, что заполнены все обязательные поля, у вопросов с выбором отмечен
          хотя бы один правильный вариант, у текстовых/пропусков — хотя бы один правильный ответ на каждый пропуск, у matching —
          пара для каждой строки.
        </p>
      </section>

      <section id="ai-chat" className="space-y-3 scroll-mt-6">
        <h2 className="text-xl font-semibold">Админ‑чат с ИИ</h2>
        <p className="text-base">
          В правом нижнем углу админки есть плавающая кнопка с иконкой чата — она открывает полноэкранное окно{" "}
          <strong>админ‑чата с ИИ</strong>. Чат можно использовать как помощника по настройке квизов, формулировке заданий и
          другим рабочим вопросам.
        </p>

        <h3 className="text-lg font-semibold">Как хранится история чата</h3>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            История сообщений <strong>сохраняется только локально в вашем браузере</strong> (в <code>localStorage</code>) на этом
            устройстве.
          </li>
          <li>Сообщения не попадают в базу данных проекта и не синхронизируются между устройствами.</li>
          <li>
            В другом браузере или на другом компьютере история будет своя (отдельная), по умолчанию пустая, пока вы не начнёте
            переписку.
          </li>
          <li>После обновления страницы история чата на этом же устройстве сохраняется, пока вы её явно не очистите.</li>
        </ul>

        <h3 className="text-lg font-semibold">Как очистить историю</h3>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            В шапке окна чата есть кнопка с иконкой корзины <strong>«Очистить чат»</strong>.
          </li>
          <li>
            Нажатие этой кнопки полностью очищает историю локально (все сохранённые сообщения удаляются из{" "}
            <code>localStorage</code>).
          </li>
          <li>Очистка влияет только на текущий браузер/устройство и не трогает историю других админов.</li>
        </ul>

        <h3 className="text-lg font-semibold">Как остановить текущий ответ</h3>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            Пока модель генерирует ответ, рядом с полем ввода показывается кнопка <strong>«стоп»</strong> (иконка квадрата).
          </li>
          <li>
            Если нажать её, текущий запрос немедленно прерывается: уже полученная часть ответа останется, а недополученный текст
            больше не будет догружаться.
          </li>
          <li>После остановки можно сразу задать новый вопрос.</li>
        </ul>

        <h3 className="text-lg font-semibold">Лимиты по запросам к модели</h3>
        <ul className="list-disc space-y-1 pl-5 text-base">
          <li>
            Для защиты от перегрузки у чата установлены лимиты на весь проект (совокупно по всем администраторам):
          </li>
          <li>
            <strong>Не более 30 запросов в минуту.</strong>
          </li>
          <li>
            <strong>Максимум 14 000 запросов в день.</strong>
          </li>
          <li>
            При превышении лимитов возможны временные ошибки при обращении к модели (отказы в генерации ответа или сообщения об
            ошибке).
          </li>
          <li>
            Рекомендуется не спамить почти одинаковыми запросами и, по возможности, объединять мелкие вопросы в чуть более крупные.
          </li>
        </ul>
      </section>
        </main>
      </div>
    </div>
  );
}


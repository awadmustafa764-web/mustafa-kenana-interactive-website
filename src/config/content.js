// All visitor-facing copy. Source: client brief. Do not invent claims, prices, links or clients.
export const BRAND = 'مصطفى كنانة';
export const WHATSAPP_NUMBER = '+970595261017';
export const WHATSAPP_DISPLAY = '+970 595 261 017';
export const WHATSAPP_URL =
  'https://wa.me/970595261017?text=' +
  encodeURIComponent('مرحبًا، أريد الاستفسار عن تصميم موقع تفاعلي لمشروعي الجامعي');

// Each scene: id (matches src/scenes), label for the HUD, section length (viewport heights,
// desktop / mobile) and beats. Beat ranges are in section-local progress (0..1).
export const SCENES = [
  {
    id: 'hall',
    label: 'الشريحة',
    length: [5, 4.2],
    beats: [
      {
        in: 0.0, out: 0.3, layout: 'monument',
        kicker: `مع ${BRAND}`,
        title: 'بدل السلايدات التقليدية…',
        titleAccent: 'خلّي مشروعك ينبهر فيه الكل!',
      },
      {
        in: 0.34, out: 0.62, layout: 'aside',
        title: 'تعبت على مشروعك الجامعي؟',
        body: 'خلّي طريقة عرضه تعكس حجم تعبك وإبداعك.',
      },
      {
        in: 0.66, out: 0.95, layout: 'statement',
        body: 'بدل عروض الـ PowerPoint التقليدية، حوّل مشروعك أو بحثك الجامعي إلى موقع ويب تفاعلي مميز، يجمع بين التصميم الاحترافي والتفاعل البصري، ويقدّم أفكارك بطريقة مختلفة عن المعتاد.',
      },
    ],
  },
  {
    id: 'unfold',
    label: 'الانتباه',
    length: [4, 3.4],
    beats: [
      { in: 0.08, out: 0.55, layout: 'column', index: '01', title: 'عرض يلفت الانتباه' },
      {
        in: 0.45, out: 0.94, layout: 'low',
        body: 'بدل السطور الطويلة والشاشات الجامدة، اعرض أفكار مشروعك من خلال تصميم تفاعلي، ورسومات بيانية، وحركات بصرية تساعد على تقديم المحتوى بطريقة جذابة.',
        hint: 'حرّك المؤشر فوق السطح',
        hintTouch: 'المس السطح واسحب',
      },
    ],
  },
  {
    id: 'disciplines',
    label: 'التخصصات',
    length: [5, 4.4],
    disciplines: ['هندسة', 'أعمال', 'طب', 'تكنولوجيا', 'وغيرها'],
    beats: [
      { in: 0.02, out: 0.98, layout: 'index', index: '02', title: 'لجميع التخصصات', hint: 'اختر تخصصك' },
      {
        in: 0.12, out: 0.9, layout: 'note',
        body: 'هندسة، أعمال، طب، تكنولوجيا، وغيرها من التخصصات. تصميم الموقع يتناسب مع فكرة مشروعك وطبيعة محتواه.',
      },
    ],
  },
  {
    id: 'link',
    label: 'الرابط',
    length: [5, 4.6],
    swapWords: ['فلاشة', 'ملف عرض', 'رابط واحد'],
    beats: [
      { in: 0.02, out: 0.97, layout: 'swap', index: '03', titlePrefix: 'مشروعك في', titleSuffix: 'لمشروعك' },
      {
        in: 0.42, out: 0.95, layout: 'columns',
        body: 'شارك رابط موقعك مع الدكتور أو لجنة المناقشة، وخلي مشروعك متاحًا عبر الرابط من مختلف الأجهزة، بدل الاعتماد على الفلاشة أو ملف العرض التقليدي.',
        labels: ['لجنة المناقشة', 'الدكتور', 'أي جهاز', 'الجوال'],
      },
    ],
  },
  {
    id: 'standout',
    label: 'التميّز',
    length: [5, 4.4],
    beats: [
      { in: 0.04, out: 0.5, layout: 'giant', index: '04', title: 'تميّز عن زملائك' },
      {
        in: 0.4, out: 0.72, layout: 'aside',
        body: 'قدّم مشروعك بأسلوب مختلف، واجعل طريقة عرضه جزءًا من تميّزه، مع أسعار مدروسة خصيصًا لطلاب الجامعات.',
        cta: 'اسأل عن السعر',
      },
      {
        in: 0.72, out: 0.9, layout: 'statement',
        body: 'ابتعد عن مشاريع الذكاء الاصطناعي التقليدية، وانتقل إلى مستوى مختلف من عرض المشاريع الجامعية من خلال مواقع ويب تفاعلية ومميزة.',
      },
    ],
  },
  {
    id: 'finale',
    label: 'تواصل',
    length: [4.2, 3.8],
    beats: [
      { in: 0.02, out: 0.42, layout: 'monument', title: 'خلّي مشروعك', titleAccent: 'يحكي عن إبداعك!' },
      { in: 0.46, out: 1.01, layout: 'contact' },
    ],
  },
];

export const CONTACT = {
  lead: `مع ${BRAND}، خلّي طريقة عرض مشروعك مختلفة عن المعتاد.`,
  body: 'للتفاصيل وحجز موقع لمشروعك القادم، تواصل عبر رسائل الصفحة أو واتساب:',
  button: 'راسلني على واتساب',
  pill: 'احجز موقع مشروعك',
};

export const INTRO = {
  counter: '01 / 24',
  caption: 'عرض تقديمي',
};

'use strict';
/* اللغات: العربية (ar) · English (en) · اردو (ur). t(key, vars) يقرأ اللغة الحالية؛ tl(lang, key, vars) للغة محددة (ملف PDF).
   قيمة النص: نص فيه {اسم} للمتغيّرات، أو دالة (vars) للجمع في الإنجليزية. ما ينقص في لغة يُؤخذ من الإنجليزية ثم العربية. */
const I18N = (() => {
  const D = {
    ar: {
      appTitle: 'طلبيات الموردين', langTitle: 'اللغة · Language · زبان', themeDay: 'الوضع النهاري', themeNight: 'الوضع الليلي',
      newOrder: 'طلبية جديدة', newOrderSub: 'صوّر الورقة وأرسلها للمورد', receive: 'استلام بضاعة', receiveSub: 'قارن ما وصل بما طلبته', history: 'الطلبيات السابقة',
      histSub: '{n} طلبية', histPending: '{n} طلبية — {p} بانتظار الاستلام', histNone: 'لا توجد طلبيات بعد',
      searchPh: '🔍 ابحث: مورد، رقم طلبية، أو موديل', fAll: 'الكل', fPending: 'بانتظار الاستلام', fDiff: 'فيها اختلافات', fDone: 'مطابقة',
      noResults: 'لا توجد نتائج', noOrdersYet: 'لا توجد طلبيات بعد.\nاضغط «طلبية جديدة» للبدء.',
      stPending: 'بانتظار الاستلام', stDone: 'مطابقة تامة ✔', stDiff: 'فيه اختلافات ({n})',
      nModels: '{n} موديل', nOrders: '{n} طلبية', nPieces: '{n} قطعة',
      // الطلبية الجديدة
      newOrderT: 'طلبية جديدة', whichBranch: 'من أي فرع؟', date: 'التاريخ', today: 'اليوم', change: 'تغيير', pickDate: 'اختر التاريخ', done: '✔ تم',
      pickSupplier: 'اختر المورد', forWhom: 'لمن هذه الطلبية؟', scanT: 'تصوير الورقة', shootSheet: 'صوّر ورقة الطلب', shoot: '📷  تصوير الورقة', pickFiles: '📁 من الجهاز', typeSelf: '✍ كتابة',
      scanTip: 'ضع الورقة مستوية بإضاءة جيدة، واجعل عمود «رقم الصنف» ظاهرًا.',
      // الموردون
      supSearchPh: '🔍 اكتب اسم المورد أو رقمه', supLocked: 'قائمة الموردين مقفلة. أدخل الرمز مرة واحدة فقط لتظهر الأسماء، أو اكتب اسم المورد بنفسك.', unlock: '🔓 فتح قائمة الموردين', unlockAsk: 'أدخل رمز فتح قائمة الموردين',
      unlocked: 'تم فتح قائمة الموردين ✔', badCode: 'الرمز غير صحيح', noSupFound: 'لا يوجد مورد بهذا الاسم في القائمة', useAs: 'استخدم «{t}» كاسم مورد', mostUsed: 'الأكثر استخدامًا', allSups: 'كل الموردين ({n})', skipSup: 'تخطّي (بدون مورد الآن)',
      // التصوير والقراءة
      prepOcr: 'جارٍ تجهيز القارئ…', prepOcrSub: 'أول مرة قد يستغرق دقيقة (تحميل نحو 45 م.ب مرة واحدة فقط)', readPage: 'جارٍ قراءة الصفحة {i} من {n}', readSub: 'لا تُغلق الصفحة — كل صفحة تستغرق بضع ثوانٍ',
      noModels: 'لم أجد موديلات في الصورة.\nتأكد أن العمود الأيمن (رقم الصنف) ظاهر كاملًا والإضاءة جيدة، ثم صوّر مرة أخرى. يمكنك أيضًا كتابة الموديلات بنفسك.', readFail: 'تعذّرت القراءة: {e}',
      readCount: 'تمت القراءة: {n} موديل', typeT: 'اكتب الموديلات', typePh: 'اكتب كل موديل في سطر.\nيمكنك كتابة الكمية بعده بمسافة، مثال:\n105949 12\nA32881 3', addBtn: '✔ إضافة', added: 'أُضيف {n} موديل',
      reviewRead: 'راجع القراءة', readOk: '✔ القراءة صحيحة', dupTag: 'مكرر — موجود أكثر من مرة', qty: 'الكمية', delete: 'حذف', typedLine: '✍ سطر مضاف بالكتابة', addLine: '＋ إضافة سطر',
      // المحرّر
      reviewOrder: 'مراجعة الطلبية', orderT: 'طلبية {no}', supplier: 'المورد', branch: 'الفرع', noteBtn: '📝 ملاحظة للمورد', notePh: 'ملاحظة للمورد تظهر في الـPDF (اختياري)', pickBranch: 'اختر الفرع',
      noModelsYet: 'لا توجد موديلات بعد. صوّر الورقة أو اكتب الموديلات.', unsure: '{n} موديل — {low} منها غير متأكد منها (باللون الأصفر)', showAll: 'عرض الكل', showYellow: 'اعرض الأصفر فقط', allChecked: '✔ {n} موديل — كلها مراجَعة',
      shootB: '📷\nتصوير', filesB: '📁\nملفات', typeB: '✍\nكتابة', page: '📄 صفحة {n}', finish: '✔  انتهيت', needModel: 'أضف موديلًا واحدًا على الأقل', needBranch: 'اختر الفرع أولًا', noSupConfirm: 'لم تحدّد المورد. هل تريد المتابعة بدونه؟', saved: 'تم الحفظ ✔',
      // الملخص
      modelsCount: 'عدد الموديلات', lastRecv: 'آخر استلام: {date} — مطابق {m} · لم يصل {x} · زيادة {e}{q}', lastRecvQ: ' · كمية {n}',
      aSend: 'إرسال الطلبية للمورد (PDF)', aReceive: 'استلام ومطابقة', aEdit: 'مراجعة وتعديل', aCopy: 'نسخ كطلبية جديدة', aDelete: 'حذف الطلبية', aSendRecv: 'إرسال تقرير الاستلام للمورد (PDF)',
      delConfirm: 'حذف الطلبية {no} نهائيًا؟', deleted: 'تم الحذف',
      // الاستلام
      receiveT: 'استلام بضاعة', fromWhichSup: 'من أي مورد وصلت البضاعة؟', noSavedOrders: 'لا توجد طلبيات محفوظة بعد.', supSearch2: '🔍 ابحث عن المورد', nOrdersPending: '{n} طلبية — {p} بانتظار الاستلام', pickOrderArrived: 'اختر الطلبية التي وصلت',
      recvT: 'استلام {no}', ordered: 'المطلوب', recvTab1: '① ما وصل ({n})', recvTab2: '② النتيجة', recvHint: 'أضف ما وصل: صوّر الورقة أو اكتب الموديلات.', showResult: 'عرض النتيجة ←',
      noRecvYet: 'لم تُضف ما وصل بعد.', addRecv: 'أضف ما وصل', diffBanner: 'فيه اختلافات: لم يصل {m} · زيادة {e}{q}', perfect: '🎉 مطابقة تامة — كل ما طُلب وصل ({n} موديل)',
      secMiss: '❌ لم يصل', secExtra: '➕ وصل ولم يُطلب', secQty: '⚠ فرق في الكمية', secOk: '✔ وصل مطابقًا ({n})', arrivedBtn: '✔ وصل', maybeRead: ' · ربما قُرئ «{m}»', isIt: 'هل هو «{m}»؟', notOrdered: 'لم يكن في الطلبية', yes: 'نعم',
      ordQty: 'المطلوب: {n}', qtyDiff: 'المطلوب {o} · الواصل {r} ({w} {d})', more: 'زيادة', less: 'ناقص', qtyLabel: 'الكمية: {n}', sendReport: '📑 إرسال التقرير للمورد', recvSaved: 'تم حفظ الاستلام ✔',
      // ما وصل فرعي (من النظام)
      arrBtn: 'ما وصل فرعي حسب النظام', arrBtnSub: 'اختر المورد والتاريخ', arrT: 'ما وصل فرعي', arrWhichSup: 'من أي مورد؟', arrNoLink: 'افتح الرابط الخاص بفرعك لعرض ما وصل. (اطلب الرابط من المسؤول)', arrFail: 'تعذّر تحميل البيانات. تأكد من الاتصال ثم حاول مرة أخرى.',
      arrLoading: 'جارٍ تحميل ما وصل فرعك…', arrUpd: 'آخر تحديث للبيانات: {t}', arrLast: 'آخر وصول {d}', arrDays: '{n} يوم', arrPickDate: 'اختر تاريخًا آخر', arrNoThatDay: 'لا يوجد وصول لهذا المورد في ذلك التاريخ', arrNoSup: 'لا توجد بيانات وصول بعد',
      arrDayRow: '{m} · {p}', arrCompare: '⚖ قارن مع طلبية', arrPickOrder: 'اختر الطلبية للمقارنة', arrNoOrder: 'لا توجد طلبية محفوظة لهذا المورد', arrReplace: 'سيُستبدل ما أُدخل سابقًا في الاستلام بما وصل من النظام. متابعة؟', arrTotals: 'الموديلات: {m} · القطع: {p}', arrFilter: '🔍 ابحث عن موديل',
      // PDF
      sharePdf: 'الملف جاهز ✔', pdfMaking: 'جارٍ إنشاء ملف الطلبية…', pdfFail: 'تعذّر إنشاء الملف: {e}', recvMaking: 'جارٍ إنشاء تقرير الاستلام…', recvFail: 'تعذّر إنشاء التقرير: {e}', noLinesPdf: 'لا توجد موديلات في الطلبية',
      pdfMsgOrder: 'طلبية بضاعة رقم {no} — {br} — {d}', pdfMsgRecv: 'تقرير استلام الطلبية رقم {no} — {r}', rIssues: 'يوجد اختلافات ({n})', rPerfect: 'مطابقة تامة', sizeKb: 'الحجم {n} ك.ب', preparing: 'جارٍ تجهيز المعاينة…', moreP: '… و{n} صفحات أخرى', noPreview: 'تعذّرت المعاينة، لكن الملف سليم.',
      shareBtn: '📤  إرسال / مشاركة', dlBtn: '⬇ تنزيل الملف فقط', dlDone: 'تم تنزيل الملف',
      // الإعدادات
      settings: 'الإعدادات', setHint: 'هذه البيانات تظهر في أعلى الـPDF الذي يصل للمورد.', coName: 'اسم الجهة', senderName: 'اسم المسؤول عن الطلبيات', senderPh: 'مثال: أحمد', phoneLab: 'رقم الجوال للتواصل', phonePh: 'مثال: 05xxxxxxxx',
      supList: 'قائمة الموردين', supOn: '✔ مفعّلة ({n} مورد)', openList: '🔓 فتح القائمة', backupLab: 'نسخة احتياطية (الطلبيات محفوظة على هذا الجهاز فقط)', saveCopy: '⬇ حفظ نسخة', restoreCopy: '⬆ استرجاع نسخة', version: 'الإصدار {v}',
      persisted: '🔒 التخزين محميّ من الحذف التلقائي', notPersisted: 'ℹ قد يحذف المتصفح البيانات عند امتلاء الذاكرة — احفظ نسخة احتياطية من حين لآخر', copySaved: 'تم حفظ النسخة (بدون صور خط اليد)', badFile: 'ملف غير صالح', restored: 'تم استرجاع {n} طلبية ✔', restoreFail: 'تعذّر الاسترجاع: {e}',
      langLab: 'لغة البرنامج', pdfLangLab: 'لغة ملف PDF الذي يصل للمورد', themeLab: 'المظهر', branchLab: 'الفرع', branchLocked: 'ثابت من رابط الفرع',
      br701: 'الدائري', br803: 'التحلية', br707: 'البديعة', br706: 'الفيحاء', br711: 'القصيم',
      ocrDet: 'تحميل نموذج الكشف…', ocrRec: 'تحميل نموذج القراءة…', back: '→',
      // PDF فقط
      sysTitle: 'متى وصلت البضاعة؟ اختر اليوم:', sysAll: 'كل الأيام معًا', sysNone: 'لا يوجد في النظام وصول من هذا المورد بعد تاريخ الطلبية. يمكنك التصوير أو الكتابة.', sysOr: 'أو أضف ما وصل بنفسك:', sysDay: '{m} · {p}',
      arrNotYet: 'هذا التاريخ غير متوفر بعد — آخر تاريخ في النظام {d}. بيانات كل يوم تظهر صباح اليوم التالي.', arrExport: '📄 تصدير PDF', arrMaking: 'جارٍ إنشاء الملف…',
      impBtn: '⬆ فتح طلبية من ملف PDF', impHint: 'اختر ملف الطلبية الذي أرسلته للمورد فتعود الطلبية كاملة هنا', impNone: 'لا توجد بيانات طلبية داخل هذا الملف. الميزة تعمل مع الملفات التي ينشئها البرنامج بعد هذا التحديث.', impDone: 'تم فتح {n} طلبية ✔', impExists: 'هذه الطلبية موجودة عندك بالفعل', impRecv: ' (مع الاستلام)',
      pTitleArr: 'ما وصل إلى الفرع', pPieces: 'عدد القطع', pTotalPieces: 'إجمالي القطع: {n}', pContA: 'ما وصل — {s} — {d} (تابع)',
      moreBtn: 'المزيد', moreOpts: 'خيارات أخرى', manualBtn: '✍ أضف ما وصل بنفسي (تصوير / كتابة)', editRecv: '✏️ تعديل ما وصل', reviewYellow: '⚠ راجع {n} موديل بالأصفر: صحّحه أو اضغط ✔', reviewDone: '✔ تمت المراجعة', finishSend: '✔ انتهيت — إرسال الطلبية', nearTxt: 'قريب من «{m}»',
      arrLive: 'مباشر حتى {t}', arrLiveNote: 'بيانات اليوم مباشرة من النظام حتى الساعة {t} — قد تصل كميات أخرى لاحقًا.', arrNoToday: 'لا يوجد وصول لهذا المورد اليوم حتى الساعة {t}.',
      todayBtn: '🔄 تحديث اليوم الآن', todayBusy: 'جارٍ جلب ما وصل اليوم من النظام…', todaySub: 'يستغرق نحو نصف دقيقة', todayDone: 'تم التحديث حتى {t} ✔', todayFail: 'تعذّر التحديث الآن، حاول بعد قليل', todayNo: 'التحديث المباشر غير متاح بعد لهذا الفرع', todayTimeout: 'لم يصل رد. تأكد أن الجهاز الرئيسي شغّال وحاول لاحقًا',
      pTitleOrder: 'طلبية بضاعة', pTitleRecv: 'تقرير استلام ومطابقة', pNo: 'رقم الطلبية', pSup: 'المورد', pBr: 'الفرع', pDate: 'التاريخ', pCount: 'عدد الموديلات', pSender: 'المسؤول عن الطلبية', pNote: 'ملاحظة',
      pIdx: 'م', pModel: 'رقم الموديل', pQty: 'الكمية', pNotes: 'ملاحظات', pTotal: 'إجمالي الموديلات: {n}', pCont: 'طلبية {no} — {s} (تابع)', pContR: 'تقرير استلام — طلبية {no} — {s} (تابع)',
      pOrderDate: 'تاريخ الطلب', pRecvDate: 'تاريخ الاستلام', pOrdRec: 'المطلوب / الواصل', pResult: 'النتيجة', pIssues: 'اختلافات: {n}', pMiss: 'لم يصل ({n})', pExtra: 'وصل ولم يُطلب ({n})', pQtyD: 'فرق في الكمية ({n})', pOk: 'وصل مطابقًا ({n})',
      pOrd: 'المطلوب', pRec: 'الواصل', pDiff: 'الفرق', pNoteCol: 'ملاحظة', pMaybe: 'ربما وصل مقروءًا: {m}', pNear: 'قريب من: {m}'
    },
    en: {
      appTitle: 'Supplier Orders', langTitle: 'اللغة · Language · زبان', themeDay: 'Day mode', themeNight: 'Night mode',
      newOrder: 'New order', newOrderSub: 'Photo the sheet and send it to the supplier', receive: 'Receive goods', receiveSub: 'Compare what arrived with what you ordered', history: 'Previous orders',
      histSub: v => v.n === 1 ? '1 order' : v.n + ' orders', histPending: v => v.n + ' order' + (v.n === 1 ? '' : 's') + ' — ' + v.p + ' waiting for delivery', histNone: 'No orders yet',
      searchPh: '🔍 Search: supplier, order no. or model', fAll: 'All', fPending: 'Waiting', fDiff: 'Differences', fDone: 'Matched',
      noResults: 'No results', noOrdersYet: 'No orders yet.\nTap “New order” to start.',
      stPending: 'Waiting for delivery', stDone: 'Fully matched ✔', stDiff: 'Differences ({n})',
      nModels: v => v.n === 1 ? '1 model' : v.n + ' models', nOrders: v => v.n === 1 ? '1 order' : v.n + ' orders', nPieces: v => v.n === 1 ? '1 piece' : v.n + ' pieces',
      newOrderT: 'New order', whichBranch: 'Which branch?', date: 'Date', today: 'Today', change: 'Change', pickDate: 'Choose the date', done: '✔ Done',
      pickSupplier: 'Choose supplier', forWhom: 'Who is this order for?', scanT: 'Photo the sheet', shootSheet: 'Photo the order sheet', shoot: '📷  Take a photo', pickFiles: '📁 From device', typeSelf: '✍ Type',
      scanTip: 'Lay the sheet flat in good light, with the “item no.” column visible.',
      supSearchPh: '🔍 Type supplier name or number', supLocked: 'The supplier list is locked. Enter the code once to show the names, or type the supplier name yourself.', unlock: '🔓 Unlock supplier list', unlockAsk: 'Enter the supplier-list code',
      unlocked: 'Supplier list unlocked ✔', badCode: 'Wrong code', noSupFound: 'No supplier with this name in the list', useAs: 'Use “{t}” as supplier name', mostUsed: 'Most used', allSups: 'All suppliers ({n})', skipSup: 'Skip (no supplier for now)',
      prepOcr: 'Preparing the reader…', prepOcrSub: 'First time it may take a minute (about 45 MB, downloaded once only)', readPage: 'Reading page {i} of {n}', readSub: 'Do not close the page — each page takes a few seconds',
      noModels: 'No models found in the photo.\nMake sure the right column (item no.) is fully visible and the light is good, then try again. You can also type the models yourself.', readFail: 'Reading failed: {e}',
      readCount: v => 'Read: ' + (v.n === 1 ? '1 model' : v.n + ' models'), typeT: 'Type the models', typePh: 'Type one model per line.\nYou can add the quantity after a space, e.g.:\n105949 12\nA32881 3', addBtn: '✔ Add', added: v => 'Added ' + (v.n === 1 ? '1 model' : v.n + ' models'),
      reviewRead: 'Check reading', readOk: '✔ Reading is correct', dupTag: 'Duplicate — appears more than once', qty: 'Qty', delete: 'Delete', typedLine: '✍ Line added by typing', addLine: '＋ Add a line',
      reviewOrder: 'Review the order', orderT: 'Order {no}', supplier: 'Supplier', branch: 'Branch', noteBtn: '📝 Note for the supplier', notePh: 'Note for the supplier, shown in the PDF (optional)', pickBranch: 'Choose branch',
      noModelsYet: 'No models yet. Photo the sheet or type the models.', unsure: v => v.n + ' model' + (v.n === 1 ? '' : 's') + ' — ' + v.low + ' not sure (in yellow)', showAll: 'Show all', showYellow: 'Show yellow only', allChecked: v => '✔ ' + v.n + ' model' + (v.n === 1 ? '' : 's') + ' — all checked',
      shootB: '📷\nPhoto', filesB: '📁\nFiles', typeB: '✍\nType', page: '📄 Page {n}', finish: '✔  Finished', needModel: 'Add at least one model', needBranch: 'Choose the branch first', noSupConfirm: 'No supplier chosen. Continue without one?', saved: 'Saved ✔',
      modelsCount: 'Number of models', lastRecv: 'Last receipt: {date} — matched {m} · missing {x} · extra {e}{q}', lastRecvQ: ' · quantity {n}',
      aSend: 'Send order to supplier (PDF)', aReceive: 'Receive & compare', aEdit: 'Review & edit', aCopy: 'Copy as a new order', aDelete: 'Delete order', aSendRecv: 'Send receipt report to supplier (PDF)',
      delConfirm: 'Delete order {no} permanently?', deleted: 'Deleted',
      receiveT: 'Receive goods', fromWhichSup: 'Which supplier did the goods come from?', noSavedOrders: 'No saved orders yet.', supSearch2: '🔍 Search supplier', nOrdersPending: v => v.n + ' order' + (v.n === 1 ? '' : 's') + ' — ' + v.p + ' waiting', pickOrderArrived: 'Choose the order that arrived',
      recvT: 'Receive {no}', ordered: 'Ordered', recvTab1: '① Arrived ({n})', recvTab2: '② Result', recvHint: 'Add what arrived: photo the sheet or type the models.', showResult: 'Show result →',
      noRecvYet: 'Nothing added yet.', addRecv: 'Add what arrived', diffBanner: 'Differences: missing {m} · extra {e}{q}', perfect: v => '🎉 Fully matched — everything ordered arrived (' + (v.n === 1 ? '1 model' : v.n + ' models') + ')',
      secMiss: '❌ Missing', secExtra: '➕ Arrived, not ordered', secQty: '⚠ Quantity difference', secOk: '✔ Arrived matching ({n})', arrivedBtn: '✔ Arrived', maybeRead: ' · maybe read as “{m}”', isIt: 'Is it “{m}”?', notOrdered: 'Was not in the order', yes: 'Yes',
      ordQty: 'Ordered: {n}', qtyDiff: 'Ordered {o} · Arrived {r} ({w} {d})', more: 'over by', less: 'short by', qtyLabel: 'Qty: {n}', sendReport: '📑 Send report to supplier', recvSaved: 'Receipt saved ✔',
      arrBtn: 'What arrived at my branch', arrBtnSub: 'Choose supplier and date', arrT: 'Arrived at my branch', arrWhichSup: 'Which supplier?', arrNoLink: 'Open your branch’s own link to see what arrived. (Ask the manager for the link)', arrFail: 'Could not load the data. Check the connection and try again.',
      arrLoading: 'Loading what arrived at your branch…', arrUpd: 'Data last updated: {t}', arrLast: 'Last arrival {d}', arrDays: v => v.n === 1 ? '1 day' : v.n + ' days', arrPickDate: 'Choose another date', arrNoThatDay: 'No arrival for this supplier on that date', arrNoSup: 'No arrival data yet',
      arrDayRow: '{m} · {p}', arrCompare: '⚖ Compare with an order', arrPickOrder: 'Choose the order to compare', arrNoOrder: 'No saved order for this supplier', arrReplace: 'What you entered before in the receipt will be replaced by the system data. Continue?', arrTotals: 'Models: {m} · Pieces: {p}', arrFilter: '🔍 Search a model',
      sharePdf: 'File is ready ✔', pdfMaking: 'Creating the order file…', pdfFail: 'Could not create the file: {e}', recvMaking: 'Creating the receipt report…', recvFail: 'Could not create the report: {e}', noLinesPdf: 'The order has no models',
      pdfMsgOrder: 'Purchase order no. {no} — {br} — {d}', pdfMsgRecv: 'Receipt report for order no. {no} — {r}', rIssues: 'differences found ({n})', rPerfect: 'fully matched', sizeKb: 'Size {n} KB', preparing: 'Preparing preview…', moreP: '… and {n} more pages', noPreview: 'Preview failed, but the file is fine.',
      shareBtn: '📤  Send / Share', dlBtn: '⬇ Download file only', dlDone: 'File downloaded',
      settings: 'Settings', setHint: 'These details appear at the top of the PDF sent to the supplier.', coName: 'Company name', senderName: 'Person in charge of orders', senderPh: 'e.g. Ahmed', phoneLab: 'Contact mobile number', phonePh: 'e.g. 05xxxxxxxx',
      supList: 'Supplier list', supOn: '✔ Active ({n} suppliers)', openList: '🔓 Unlock the list', backupLab: 'Backup (orders are stored on this device only)', saveCopy: '⬇ Save a copy', restoreCopy: '⬆ Restore a copy', version: 'Version {v}',
      persisted: '🔒 Storage is protected from automatic deletion', notPersisted: 'ℹ The browser may delete data when memory is full — save a backup from time to time', copySaved: 'Backup saved (without handwriting images)', badFile: 'Invalid file', restored: v => 'Restored ' + (v.n === 1 ? '1 order' : v.n + ' orders') + ' ✔', restoreFail: 'Restore failed: {e}',
      langLab: 'App language', pdfLangLab: 'Language of the PDF sent to the supplier', themeLab: 'Appearance', branchLab: 'Branch', branchLocked: 'fixed by the branch link',
      br701: 'Al-Daeri', br803: 'Al-Tahliyah', br707: 'Al-Badiah', br706: 'Al-Faihaa', br711: 'Al-Qassim',
      ocrDet: 'Loading detection model…', ocrRec: 'Loading reading model…', back: '←',
      sysTitle: 'When did the goods arrive? Pick the day:', sysAll: 'All days together', sysNone: 'The system shows no arrival from this supplier after the order date. You can photo or type instead.', sysOr: 'Or add what arrived yourself:', sysDay: '{m} · {p}',
      arrNotYet: 'This date is not available yet — latest date in the system is {d}. Each day appears the next morning.', arrExport: '📄 Export PDF', arrMaking: 'Creating the file…',
      impBtn: '⬆ Open an order from a PDF', impHint: 'Choose the order file you sent to the supplier and the full order comes back here', impNone: 'No order data inside this file. This works with files created by the app after this update.', impDone: v => 'Opened ' + (v.n === 1 ? '1 order' : v.n + ' orders') + ' ✔', impExists: 'You already have this order', impRecv: ' (with receipt)',
      pTitleArr: 'GOODS RECEIVED AT BRANCH', pPieces: 'Pieces', pTotalPieces: 'Total pieces: {n}', pContA: 'Received — {s} — {d} (cont.)',
      moreBtn: 'More', moreOpts: 'More options', manualBtn: '✍ Add what arrived myself (photo / type)', editRecv: '✏️ Edit what arrived', reviewYellow: v => '⚠ Check ' + v.n + ' model' + (v.n === 1 ? '' : 's') + ' in yellow: fix it or tap ✔', reviewDone: '✔ Review done', finishSend: '✔ Finished — send the order', nearTxt: 'Close to “{m}”',
      arrLive: 'Live as of {t}', arrLiveNote: 'Today’s data comes live from the system as of {t} — more may still arrive.', arrNoToday: 'No arrival from this supplier today as of {t}.',
      todayBtn: '🔄 Refresh today now', todayBusy: 'Getting today’s arrivals from the system…', todaySub: 'Takes about half a minute', todayDone: 'Updated as of {t} ✔', todayFail: 'Could not update now, try again shortly', todayNo: 'Live update is not available yet for this branch', todayTimeout: 'No reply. Make sure the main computer is on and try later',
      pTitleOrder: 'PURCHASE ORDER', pTitleRecv: 'RECEIPT & MATCHING REPORT', pNo: 'Order no.', pSup: 'Supplier', pBr: 'Branch', pDate: 'Date', pCount: 'Number of models', pSender: 'Order contact', pNote: 'Note',
      pIdx: '#', pModel: 'Model no.', pQty: 'Qty', pNotes: 'Notes', pTotal: 'Total models: {n}', pCont: 'Order {no} — {s} (cont.)', pContR: 'Receipt report — order {no} — {s} (cont.)',
      pOrderDate: 'Order date', pRecvDate: 'Receipt date', pOrdRec: 'Ordered / Received', pResult: 'Result', pIssues: 'Differences: {n}', pMiss: 'Missing ({n})', pExtra: 'Arrived, not ordered ({n})', pQtyD: 'Quantity difference ({n})', pOk: 'Arrived matching ({n})',
      pOrd: 'Ordered', pRec: 'Received', pDiff: 'Diff.', pNoteCol: 'Note', pMaybe: 'May have arrived read as: {m}', pNear: 'Close to: {m}'
    },
    ur: {
      appTitle: 'سپلائرز کے آرڈر', langTitle: 'اللغة · Language · زبان', themeDay: 'دن کا موڈ', themeNight: 'رات کا موڈ',
      newOrder: 'نیا آرڈر', newOrderSub: 'کاغذ کی تصویر لیں اور سپلائر کو بھیجیں', receive: 'مال وصول کریں', receiveSub: 'جو آیا اس کا آرڈر سے موازنہ کریں', history: 'پچھلے آرڈر',
      histSub: '{n} آرڈر', histPending: '{n} آرڈر — {p} وصولی کے منتظر', histNone: 'ابھی کوئی آرڈر نہیں',
      searchPh: '🔍 تلاش: سپلائر، آرڈر نمبر یا ماڈل', fAll: 'سب', fPending: 'وصولی کے منتظر', fDiff: 'فرق والے', fDone: 'مکمل مطابقت',
      noResults: 'کوئی نتیجہ نہیں', noOrdersYet: 'ابھی کوئی آرڈر نہیں۔\nشروع کرنے کے لیے «نیا آرڈر» دبائیں۔',
      stPending: 'وصولی کا انتظار', stDone: 'مکمل مطابقت ✔', stDiff: 'فرق موجود ہے ({n})',
      nModels: '{n} ماڈل', nOrders: '{n} آرڈر', nPieces: '{n} عدد',
      newOrderT: 'نیا آرڈر', whichBranch: 'کون سی برانچ؟', date: 'تاریخ', today: 'آج', change: 'تبدیل', pickDate: 'تاریخ منتخب کریں', done: '✔ ہو گیا',
      pickSupplier: 'سپلائر منتخب کریں', forWhom: 'یہ آرڈر کس کے لیے ہے؟', scanT: 'کاغذ کی تصویر', shootSheet: 'آرڈر شیٹ کی تصویر لیں', shoot: '📷  تصویر لیں', pickFiles: '📁 ڈیوائس سے', typeSelf: '✍ لکھیں',
      scanTip: 'کاغذ ہموار رکھیں، روشنی اچھی ہو اور «آئٹم نمبر» کالم نظر آئے۔',
      supSearchPh: '🔍 سپلائر کا نام یا نمبر لکھیں', supLocked: 'سپلائرز کی فہرست مقفل ہے۔ نام دیکھنے کے لیے کوڈ ایک بار درج کریں، یا سپلائر کا نام خود لکھیں۔', unlock: '🔓 فہرست کھولیں', unlockAsk: 'سپلائرز کی فہرست کا کوڈ درج کریں',
      unlocked: 'فہرست کھل گئی ✔', badCode: 'کوڈ غلط ہے', noSupFound: 'اس نام کا کوئی سپلائر فہرست میں نہیں', useAs: '«{t}» کو سپلائر کے نام کے طور پر استعمال کریں', mostUsed: 'سب سے زیادہ استعمال شدہ', allSups: 'تمام سپلائرز ({n})', skipSup: 'چھوڑیں (ابھی سپلائر کے بغیر)',
      prepOcr: 'ریڈر تیار ہو رہا ہے…', prepOcrSub: 'پہلی بار ایک منٹ لگ سکتا ہے (تقریباً 45 MB، صرف ایک بار ڈاؤن لوڈ)', readPage: 'صفحہ {i} از {n} پڑھا جا رہا ہے', readSub: 'صفحہ بند نہ کریں — ہر صفحے میں چند سیکنڈ لگتے ہیں',
      noModels: 'تصویر میں کوئی ماڈل نہیں ملا۔\nیقینی بنائیں کہ دایاں کالم (آئٹم نمبر) پورا نظر آ رہا ہے اور روشنی اچھی ہے، پھر دوبارہ تصویر لیں۔ آپ ماڈل خود بھی لکھ سکتے ہیں۔', readFail: 'پڑھنے میں ناکامی: {e}',
      readCount: 'پڑھا گیا: {n} ماڈل', typeT: 'ماڈل لکھیں', typePh: 'ہر ماڈل الگ سطر میں لکھیں۔\nمقدار خالی جگہ دے کر لکھ سکتے ہیں، مثال:\n105949 12\nA32881 3', addBtn: '✔ شامل کریں', added: '{n} ماڈل شامل ہوئے',
      reviewRead: 'پڑھائی چیک کریں', readOk: '✔ پڑھائی درست ہے', dupTag: 'دہرایا ہوا — ایک سے زیادہ بار ہے', qty: 'مقدار', delete: 'حذف', typedLine: '✍ ہاتھ سے لکھی ہوئی سطر', addLine: '＋ سطر شامل کریں',
      reviewOrder: 'آرڈر کا جائزہ', orderT: 'آرڈر {no}', supplier: 'سپلائر', branch: 'برانچ', noteBtn: '📝 سپلائر کے لیے نوٹ', notePh: 'سپلائر کے لیے نوٹ، PDF میں دکھائی دے گا (اختیاری)', pickBranch: 'برانچ منتخب کریں',
      noModelsYet: 'ابھی کوئی ماڈل نہیں۔ کاغذ کی تصویر لیں یا ماڈل لکھیں۔', unsure: '{n} ماڈل — ان میں سے {low} کے بارے میں یقین نہیں (پیلے رنگ میں)', showAll: 'سب دکھائیں', showYellow: 'صرف پیلے دکھائیں', allChecked: '✔ {n} ماڈل — سب چیک ہو چکے',
      shootB: '📷\nتصویر', filesB: '📁\nفائلیں', typeB: '✍\nلکھیں', page: '📄 صفحہ {n}', finish: '✔  مکمل', needModel: 'کم از کم ایک ماڈل شامل کریں', needBranch: 'پہلے برانچ منتخب کریں', noSupConfirm: 'سپلائر منتخب نہیں کیا۔ کیا اس کے بغیر جاری رکھیں؟', saved: 'محفوظ ہو گیا ✔',
      modelsCount: 'ماڈلز کی تعداد', lastRecv: 'آخری وصولی: {date} — مطابق {m} · نہیں آئے {x} · زائد {e}{q}', lastRecvQ: ' · مقدار {n}',
      aSend: 'آرڈر سپلائر کو بھیجیں (PDF)', aReceive: 'وصولی اور موازنہ', aEdit: 'جائزہ اور ترمیم', aCopy: 'نئے آرڈر کے طور پر نقل', aDelete: 'آرڈر حذف کریں', aSendRecv: 'وصولی کی رپورٹ سپلائر کو بھیجیں (PDF)',
      delConfirm: 'آرڈر {no} ہمیشہ کے لیے حذف کریں؟', deleted: 'حذف ہو گیا',
      receiveT: 'مال وصول کریں', fromWhichSup: 'مال کس سپلائر سے آیا؟', noSavedOrders: 'ابھی کوئی محفوظ آرڈر نہیں۔', supSearch2: '🔍 سپلائر تلاش کریں', nOrdersPending: '{n} آرڈر — {p} وصولی کے منتظر', pickOrderArrived: 'وہ آرڈر منتخب کریں جو آیا',
      recvT: 'وصولی {no}', ordered: 'منگوایا گیا', recvTab1: '① جو آیا ({n})', recvTab2: '② نتیجہ', recvHint: 'جو آیا وہ شامل کریں: کاغذ کی تصویر لیں یا ماڈل لکھیں۔', showResult: '← نتیجہ دکھائیں',
      noRecvYet: 'ابھی کچھ شامل نہیں کیا۔', addRecv: 'جو آیا شامل کریں', diffBanner: 'فرق موجود ہے: نہیں آئے {m} · زائد {e}{q}', perfect: '🎉 مکمل مطابقت — جو منگوایا سب آ گیا ({n} ماڈل)',
      secMiss: '❌ نہیں آئے', secExtra: '➕ آئے مگر منگوائے نہیں تھے', secQty: '⚠ مقدار میں فرق', secOk: '✔ مطابق آئے ({n})', arrivedBtn: '✔ آ گیا', maybeRead: ' · شاید «{m}» پڑھا گیا', isIt: 'کیا یہ «{m}» ہے؟', notOrdered: 'آرڈر میں نہیں تھا', yes: 'ہاں',
      ordQty: 'منگوایا: {n}', qtyDiff: 'منگوایا {o} · آیا {r} ({w} {d})', more: 'زیادہ', less: 'کم', qtyLabel: 'مقدار: {n}', sendReport: '📑 رپورٹ سپلائر کو بھیجیں', recvSaved: 'وصولی محفوظ ہو گئی ✔',
      arrBtn: 'میری برانچ میں کیا آیا', arrBtnSub: 'سپلائر اور تاریخ منتخب کریں', arrT: 'میری برانچ میں آیا', arrWhichSup: 'کون سا سپلائر؟', arrNoLink: 'جو آیا وہ دیکھنے کے لیے اپنی برانچ کا مخصوص لنک کھولیں۔ (لنک مینیجر سے مانگیں)', arrFail: 'ڈیٹا لوڈ نہیں ہو سکا۔ کنکشن چیک کریں اور دوبارہ کوشش کریں۔',
      arrLoading: 'آپ کی برانچ میں آیا ہوا مال لوڈ ہو رہا ہے…', arrUpd: 'ڈیٹا کی آخری اپڈیٹ: {t}', arrLast: 'آخری آمد {d}', arrDays: '{n} دن', arrPickDate: 'کوئی اور تاریخ منتخب کریں', arrNoThatDay: 'اس تاریخ کو اس سپلائر کا کوئی مال نہیں آیا', arrNoSup: 'ابھی آمد کا کوئی ڈیٹا نہیں',
      arrDayRow: '{m} · {p}', arrCompare: '⚖ آرڈر سے موازنہ کریں', arrPickOrder: 'موازنے کے لیے آرڈر منتخب کریں', arrNoOrder: 'اس سپلائر کا کوئی محفوظ آرڈر نہیں', arrReplace: 'وصولی میں پہلے درج کیا ہوا سسٹم کے ڈیٹا سے بدل دیا جائے گا۔ جاری رکھیں؟', arrTotals: 'ماڈل: {m} · عدد: {p}', arrFilter: '🔍 ماڈل تلاش کریں',
      sharePdf: 'فائل تیار ہے ✔', pdfMaking: 'آرڈر کی فائل بن رہی ہے…', pdfFail: 'فائل نہیں بن سکی: {e}', recvMaking: 'وصولی کی رپورٹ بن رہی ہے…', recvFail: 'رپورٹ نہیں بن سکی: {e}', noLinesPdf: 'آرڈر میں کوئی ماڈل نہیں',
      pdfMsgOrder: 'مال کا آرڈر نمبر {no} — {br} — {d}', pdfMsgRecv: 'آرڈر نمبر {no} کی وصولی رپورٹ — {r}', rIssues: 'فرق موجود ہے ({n})', rPerfect: 'مکمل مطابقت', sizeKb: 'سائز {n} KB', preparing: 'پیش منظر تیار ہو رہا ہے…', moreP: '… اور {n} مزید صفحات', noPreview: 'پیش منظر نہیں بن سکا، لیکن فائل درست ہے۔',
      shareBtn: '📤  بھیجیں / شیئر کریں', dlBtn: '⬇ صرف فائل ڈاؤن لوڈ کریں', dlDone: 'فائل ڈاؤن لوڈ ہو گئی',
      settings: 'ترتیبات', setHint: 'یہ معلومات سپلائر کو جانے والی PDF کے اوپر ظاہر ہوتی ہیں۔', coName: 'ادارے کا نام', senderName: 'آرڈرز کا ذمہ دار', senderPh: 'مثال: احمد', phoneLab: 'رابطے کا موبائل نمبر', phonePh: 'مثال: 05xxxxxxxx',
      supList: 'سپلائرز کی فہرست', supOn: '✔ فعال ({n} سپلائر)', openList: '🔓 فہرست کھولیں', backupLab: 'بیک اپ (آرڈر صرف اسی ڈیوائس پر محفوظ ہیں)', saveCopy: '⬇ کاپی محفوظ کریں', restoreCopy: '⬆ کاپی بحال کریں', version: 'ورژن {v}',
      persisted: '🔒 اسٹوریج خودکار حذف ہونے سے محفوظ ہے', notPersisted: 'ℹ میموری بھر جانے پر براؤزر ڈیٹا حذف کر سکتا ہے — وقتاً فوقتاً بیک اپ محفوظ کریں', copySaved: 'کاپی محفوظ ہو گئی (ہاتھ کی لکھائی کی تصاویر کے بغیر)', badFile: 'غلط فائل', restored: '{n} آرڈر بحال ہوئے ✔', restoreFail: 'بحالی ناکام: {e}',
      langLab: 'ایپ کی زبان', pdfLangLab: 'سپلائر کو جانے والی PDF کی زبان', themeLab: 'ظاہری شکل', branchLab: 'برانچ', branchLocked: 'برانچ کے لنک سے طے شدہ',
      br701: 'الدائری', br803: 'التحلیہ', br707: 'البدیعہ', br706: 'الفیحاء', br711: 'القصیم',
      ocrDet: 'شناخت کا ماڈل لوڈ ہو رہا ہے…', ocrRec: 'پڑھنے کا ماڈل لوڈ ہو رہا ہے…', back: '→',
      sysTitle: 'مال کب آیا؟ دن منتخب کریں:', sysAll: 'تمام دن اکٹھے', sysNone: 'آرڈر کی تاریخ کے بعد اس سپلائر کا سسٹم میں کوئی مال نہیں آیا۔ آپ تصویر لے سکتے ہیں یا خود لکھ سکتے ہیں۔', sysOr: 'یا جو آیا خود شامل کریں:', sysDay: '{m} · {p}',
      arrNotYet: 'یہ تاریخ ابھی دستیاب نہیں — سسٹم میں آخری تاریخ {d} ہے۔ ہر دن کا ڈیٹا اگلی صبح آتا ہے۔', arrExport: '📄 PDF بنائیں', arrMaking: 'فائل بن رہی ہے…',
      impBtn: '⬆ PDF فائل سے آرڈر کھولیں', impHint: 'سپلائر کو بھیجی ہوئی آرڈر فائل منتخب کریں، پورا آرڈر یہاں واپس آ جائے گا', impNone: 'اس فائل میں آرڈر کا ڈیٹا نہیں۔ یہ سہولت اس اپڈیٹ کے بعد ایپ سے بنی فائلوں کے ساتھ کام کرتی ہے۔', impDone: '{n} آرڈر کھل گئے ✔', impExists: 'یہ آرڈر آپ کے پاس پہلے سے موجود ہے', impRecv: ' (وصولی سمیت)',
      pTitleArr: 'برانچ میں آیا ہوا مال', pPieces: 'عدد', pTotalPieces: 'کل عدد: {n}', pContA: 'آمد — {s} — {d} (جاری)',
      moreBtn: 'مزید', moreOpts: 'مزید اختیارات', manualBtn: '✍ جو آیا خود شامل کروں (تصویر / لکھائی)', editRecv: '✏️ جو آیا اسے تبدیل کریں', reviewYellow: '⚠ پیلے رنگ کے {n} ماڈل چیک کریں: درست کریں یا ✔ دبائیں', reviewDone: '✔ جائزہ مکمل', finishSend: '✔ مکمل — آرڈر بھیجیں', nearTxt: 'قریب: «{m}»',
      arrLive: 'براہ راست {t} تک', arrLiveNote: 'آج کا ڈیٹا سسٹم سے براہ راست {t} تک کا ہے — مزید مال بعد میں آ سکتا ہے۔', arrNoToday: 'آج {t} تک اس سپلائر کا کوئی مال نہیں آیا۔',
      todayBtn: '🔄 آج کا ڈیٹا ابھی اپڈیٹ کریں', todayBusy: 'آج آیا ہوا مال سسٹم سے لیا جا رہا ہے…', todaySub: 'تقریباً آدھا منٹ لگتا ہے', todayDone: '{t} تک اپڈیٹ ہو گیا ✔', todayFail: 'ابھی اپڈیٹ نہیں ہو سکا، تھوڑی دیر بعد کوشش کریں', todayNo: 'اس برانچ کے لیے براہ راست اپڈیٹ ابھی دستیاب نہیں', todayTimeout: 'جواب نہیں آیا۔ یقینی بنائیں کہ مین کمپیوٹر چل رہا ہے اور بعد میں کوشش کریں',
      pTitleOrder: 'مال کا آرڈر', pTitleRecv: 'وصولی اور موازنہ رپورٹ', pNo: 'آرڈر نمبر', pSup: 'سپلائر', pBr: 'برانچ', pDate: 'تاریخ', pCount: 'ماڈلز کی تعداد', pSender: 'آرڈر کا ذمہ دار', pNote: 'نوٹ',
      pIdx: 'نمبر', pModel: 'ماڈل نمبر', pQty: 'مقدار', pNotes: 'نوٹس', pTotal: 'کل ماڈل: {n}', pCont: 'آرڈر {no} — {s} (جاری)', pContR: 'وصولی رپورٹ — آرڈر {no} — {s} (جاری)',
      pOrderDate: 'آرڈر کی تاریخ', pRecvDate: 'وصولی کی تاریخ', pOrdRec: 'منگوایا / آیا', pResult: 'نتیجہ', pIssues: 'فرق: {n}', pMiss: 'نہیں آئے ({n})', pExtra: 'آئے مگر منگوائے نہیں تھے ({n})', pQtyD: 'مقدار میں فرق ({n})', pOk: 'مطابق آئے ({n})',
      pOrd: 'منگوایا', pRec: 'آیا', pDiff: 'فرق', pNoteCol: 'نوٹ', pMaybe: 'شاید اس طرح پڑھا گیا: {m}', pNear: 'قریب: {m}'
    }
  };
  const MONTHS = {
    ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    ur: ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر']
  };
  const DAYS = {
    ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    ur: ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ']
  };
  let lang = 'ar';
  const LANGS = ['ar', 'en', 'ur'];
  const tl = (l, k, v) => {
    let s = (D[l] || {})[k]; if (s == null) s = D.en[k]; if (s == null) s = D.ar[k]; if (s == null) return k;
    return typeof s === 'function' ? s(v || {}) : s.replace(/\{(\w+)\}/g, (_, n) => v && v[n] != null ? v[n] : '');
  };
  const date = (iso, l) => { l = l || lang; const d = String(iso || '').split('-'); return d.length === 3 ? (+d[2]) + ' ' + MONTHS[l][+d[1] - 1] + ' ' + d[0] : (iso || ''); };
  const weekday = (iso, l) => { const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? '' : DAYS[l || lang][d.getDay()]; };
  return {D, LANGS, tl, date, weekday, rtl: l => l !== 'en', get lang() { return lang; }, set: l => { if (LANGS.includes(l)) lang = l; }, t: (k, v) => tl(lang, k, v)};
})();
const t = (k, v) => I18N.t(k, v);
if (typeof module !== 'undefined') module.exports = I18N;

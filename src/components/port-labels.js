// English labels and fixed colour mapping for Ukrainian port-statistics
// data (cargo_type, port_name, port_operator from the raw volumes CSV).
// Consumed by src/ukraine-ports.md and the chart components it loads.
//
// Design choices:
//   • cargo_type, port_name and port_operator (terminal) are all translated
//     up-front, so the rest of the pipeline never sees the original Ukrainian
//     strings. Unknown terminals fall through to their raw Ukrainian name.
//   • Colours are tied to the English category name, not to a rank, so the
//     same cargo / port keeps the same colour even when the data shifts.
//   • OTHER is always grey and never appears in cargoColors/portColors —
//     consumers use `colors.get(name) ?? OTHER_COLOR` for the fallback.

export const OTHER       = "Other";
export const OTHER_COLOR = "#dddddd";

// Tableau 10 — the standard d3.schemeTableau10 palette, hard-coded here so
// every consumer in the page draws from the same fixed slot order.
export const tableau10 = [
  "#4e79a7", // blue
  "#f28e2c", // orange
  "#e15759", // red
  "#76b7b2", // teal
  "#59a14f", // green
  "#edc949", // yellow
  "#af7aa1", // purple
  "#ff9da7", // pink
  "#9c755f", // brown
  "#bab0ab", // muted grey
];

// ── Cargo types ───────────────────────────────────────────────────────────
export const cargoNames = new Map([
  ["Хлібні - всього",                        "Grain"],
  ["Руда всяка",                             "Iron ore"],
  ["Чорні метали - всього",                  "Ferrous metals"],
  ["Інші сипучі вантажі",                    "Other dry bulk"],
  ["Контейнери (тис. тонн)",                 "Containers"],
  ["Олія",                                   "Vegetable oil"],
  ["Вугілля",                                "Coal"],
  ["Будівельні",                             "Construction materials"],
  ["Нафтопродукти",                          "Petroleum products"],
  ["Хімічні (наливні)",                      "Chemicals (liquid)"],
  ["Хімічні, мінеральні добрива (сипучі)",   "Fertilisers (bulk)"],
  ["Хім. та мін. добрива (тарно-штучні)",    "Fertilisers (packaged)"],
  ["Автомобілі (тис. тонн)",                 "Vehicles"],
  ["Автотехніка й сільгосптехніка",          "Automotive & farm equipment"],
  ["Нафта",                                  "Crude oil"],
  ["Інші тарно-штучні вантажі",              "Other general cargo"],
  ["Інші наливні вантажі",                   "Other liquid bulk"],
  ["Лісні вантажі",                          "Timber"],
  ["Кокс",                                   "Coke"],
  ["Кольорові металі - всього",              "Non-ferrous metals"],
  ["Кольорові метали - всього",              "Non-ferrous metals"],
  ["Продовольчі вантажі - всього",           "Food products"],
  ["Пром.товари в ящиках і кіпах",           "Industrial goods (packaged)"],
  ["Цемент (в тарі)",                        "Cement (packaged)"],
  ["Цемент (сипучій)",                       "Cement (bulk)"],
  ["Цукор",                                  "Sugar"],
  ["Папір",                                  "Paper"],
]);

// Top-10 cargo by lifetime volume — each gets a fixed slot from tableau10.
// Anything not listed here falls through to OTHER_COLOR.
export const cargoColors = new Map([
  ["Grain",                  tableau10[0]],
  ["Iron ore",               tableau10[1]],
  ["Ferrous metals",         tableau10[2]],
  ["Other dry bulk",         tableau10[3]],
  ["Containers",             tableau10[4]],
  ["Vegetable oil",          tableau10[5]],
  ["Coal",                   tableau10[6]],
  ["Construction materials", tableau10[7]],
  ["Petroleum products",     tableau10[8]],
  ["Chemicals (liquid)",     tableau10[9]],
]);

// ── Ports ─────────────────────────────────────────────────────────────────
// Note: the volumes loader normalises "Морський порт \"Южний\"" →
// "Морський порт \"Південний\"" before this lookup applies.
export const portNames = new Map([
  ["Морський порт \"Південний\"",          "Pivdennyi"],
  ["Морський порт Чорноморськ",            "Chornomorsk"],
  ["Одеський морський порт",               "Odesa"],
  ["Миколаївський морський порт",          "Mykolaiv"],
  ["Ізмаїльський морський порт",           "Izmail"],
  ["Маріупольський морський порт",         "Mariupol"],
  ["Спеціалізований морський порт Ольвія", "Olvia"],
  ["Херсонський морський порт",            "Kherson"],
  ["Ренійський морський порт",             "Reni"],
  ["Бердянський морський порт",            "Berdiansk"],
  ["Морський порт \"Усть-Дунайськ\"",      "Ust-Dunaisk"],
  ["Білгород-Дністровський морський порт", "Bilhorod-Dnistrovskyi"],
  ["Скадовський морський порт",            "Skadovsk"],
]);

export const portColors = new Map([
  ["Pivdennyi",   tableau10[0]],
  ["Chornomorsk", tableau10[1]],
  ["Odesa",       tableau10[2]],
  ["Mykolaiv",    tableau10[3]],
  ["Izmail",      tableau10[4]],
  ["Mariupol",    tableau10[5]],
  ["Olvia",       tableau10[6]],
  ["Kherson",     tableau10[7]],
  ["Reni",        tableau10[8]],
  ["Berdiansk",   tableau10[9]],
]);

// ── Lookup helpers ────────────────────────────────────────────────────────
export const toCargo = uk => cargoNames.get(uk) ?? uk;
export const toPort  = uk => portNames.get(uk)  ?? uk;
export const colorOfCargo = name => cargoColors.get(name) ?? OTHER_COLOR;
export const colorOfPort  = name => portColors.get(name)  ?? OTHER_COLOR;

// Move the OTHER bucket to the end of an ordered category array — used so the
// "Other" band always sits at the top of the bar-drilldown stack and at the
// end of the legend, regardless of its volume rank.
export const withOtherLast = arr => {
  const i = arr.indexOf(OTHER);
  return i < 0 ? arr : [...arr.slice(0, i), ...arr.slice(i + 1), OTHER];
};

// ── Terminals (port operators) ────────────────────────────────────────────
// Single source of truth: rows of [UkrainianName, EnglishName, Group1, Group2].
//   • English name: short, readable label used in treemap slices.
//   • Group1: owner group through 2021. Group2: from 2023 onward.
//     Empty string ⇒ no group (consumer treats this as OTHER).
// Unknown terminals (not in this table) fall back to the raw Ukrainian
// string when looked up via toTerminal().
const terminals = [
  // ── Berdiansk ───────────────────────────────────────────────────────────
  ["ДП «Бердянський МТП»",                                                "Berdiansk MTP",                  "SOE",                  "SOE"],
  ["ПрАТ «БЗПТО»",                                                        "BZPTO",                          "",                     ""],
  ["ТОВ «Аскет Шиппінг»",                                                 "Asket Shipping",                 "Asket Shipping",       "Asket Shipping"],
  ["ТОВ \"Амбар Експорт БКВ\"",                                           "Ambar Export BKV",               "",                     ""],
  ["ТОВ «Агро-КЛАСС»",                                                    "Agro-CLASS",                     "",                     ""],
  ["ЄВРО ГАЗ ГРУП",                                                       "Euro Gas Group",                 "",                     ""],

  // ── Bilhorod-Dnistrovskyi ───────────────────────────────────────────────
  ["ПП \"СВ\"",                                                           "SV",                             "",                     ""],
  ["ДП «Білгород-Дністровський МТП»",                                     "Bilhorod-Dnistrovskyi MTP",      "SOE",                  "SOE"],

  // ── Izmail ──────────────────────────────────────────────────────────────
  ["ДП «Ізмаїльський МТП»",                                               "Izmail MTP",                     "SOE",                  "SOE"],
  ["ТОВ «Агенція Трайтон Сервіс Україна»",                                "Triton Service Ukraine",         "",                     ""],
  ["ТОВ «СЕРВІСПОРТ»",                                                    "ServicePort",                    "",                     ""],
  ["ТОВ \"ВІЛЛЕ ФОРТЕ Україна\"",                                         "Ville Forte Ukraine",            "",                     ""],
  ["ТОВ «Ньюeнерджи»",                                                    "NewEnergy",                      "",                     ""],
  ["ТОВ «Ізмаїльський елеватор»",                                         "Izmail Elevator",                "",                     ""],
  ["ТОВ \"Е.К.О. ГРУП\"",                                                 "E.K.O. Group",                   "",                     ""],
  ["ПАТ \"ДУНАЙСУДНОРЕМОНТ\"",                                            "Dunaisudnoremont",               "Urbansky",             "Urbansky"],
  ["ТОВ \"САН ЛОГІСТИК\"",                                                "Sun Logistic",                   "",                     ""],
  ["ТОВ \"НІБУЛОН\"",                                                     "Nibulon",                        "Nibulon",              "Nibulon"],
  ["ПрАТ \"ІРП \"ДУНАЙСУДНОСЕРВІС\"",                                     "IRP Dunaisudnoservice",          "Urbansky",             "Urbansky"],
  ["ТОВ \"КРАНШИП\"",                                                     "Kranship",                       "",                     ""],
  ["ПП \"ГАЛАКТИКА\"",                                                    "Galaktyka",                      "",                     ""],
  ["ТОВ «Логістика Дніпра»",                                              "Dnipro Logistics",               "",                     ""],
  ["ТОВ «ЕКОНОВАТІКА»",                                                   "Econovatica",                    "",                     ""],
  ["ПрАТ \"ІЦКК\"",                                                       "ITsKK",                          "",                     ""],
  ["ТОВ \"ПОТК\"",                                                        "POTK",                           "",                     ""],
  ["ТОВ \"Агротранс Логістика\"",                                         "Agrotrans Logistics",            "",                     ""],
  ["ТОВ «АгроТрейдСтивідорінг»",                                          "AgroTradeStevedoring",           "",                     ""],
  ["Нибулон",                                                             "Nibulon",                        "Nibulon",              "Nibulon"],
  ["ТОВ «СП«ДУНАЙСУДНОСЕРВІС»",                                           "SP Dunaisudnoservice",           "Urbansky",             "Urbansky"],
  ["ТОВ «МАСТЕРБУД-Д»",                                                   "Masterbud-D",                    "",                     ""],
  ["КП «ДУНАЙСЕРВІС»",                                                    "DunaiService",                   "",                     ""],
  ["ТОВ «РІВ.А.ХОЛДІНГ»",                                                 "RIV.A.Holding",                  "",                     ""],
  ["ІФ ДП \"АМПУ\" (Адміністрація Ізмаїльського МП)",                     "Izmail MTP",                   "SOE",                  "SOE"],

  // ── Mariupol ────────────────────────────────────────────────────────────
  ["ДП «Маріупольський МТП»",                                             "Mariupol MTP",                   "SOE",                  "SOE"],
  ["ТОВ «СРЗ»",                                                           "SRZ",                            "Mariupol Investments", "Mariupol Investments"],
  ["ТОВ \"СТТ\"",                                                         "STT",                            "",                     ""],

  // ── Mykolaiv ────────────────────────────────────────────────────────────
  ["ТОВ \" МСП Ніка-Тера\"",                                              "MSP Nika-Tera",                  "Group DF",             "Group DF"],
  ["ТОВ «Стивідорна Інвестиційна компанія»",                              "Stevedore Investment Co",        "",                     ""],
  ["ТОВ «Порт Очаків»",                                                   "Port Ochakiv",                   "",                     ""],
  ["ПАТ \"ЧСЗ\"",                                                         "ChSZ",                           "",                     ""],
  ["Іноземне підприємство «Южная Стівідорінг Компані Лімітед»",           "Yuzhna Stevedoring",             "",                     ""],
  ["ТОВ «Грінтур-Екс»",                                                   "Greentur-Ex",                    "Bunge / Viterra",      "Bunge / Viterra"],
  ["ТОВ \"ДССК\"",                                                        "DSSK",                           "COFCO",                "COFCO"],
  ["Філії  ПАТ «Судноплавна компанія «Укррічфлот» «Миколаївський річковий порт»", "Ukrrichflot Mykolaiv River Port", "Ukrrichflot",  "Ukrrichflot"],
  ["ПАТ «Миколаївський СБЗ «Океан»",                                      "Mykolaiv Okean Shipyard",        "",                     ""],
  ["ДБМП ТОВ «Миколаївський глиноземний завод»",                          "Mykolaiv Alumina Plant",         "Deripaska",            "SOE"],
  ["ТОВ «Стивідорна Компанія Нікмет-Термінал»",                           "Nikmet-Terminal",                "Arcelor Mittal",       "Arcelor Mittal"],
  ["ТОВ \"Метал Стивідорінг Компані\"",                                   "Metal Stevedoring Co",           "",                     ""],
  ["ТОВ «Евері»",                                                         "Evere",                          "Bunge / Viterra",      "Bunge / Viterra"],
  ["ТОВ СП «НІБУЛОН»",                                                    "Nibulon JV",                     "Nibulon",              "Nibulon"],
  ["Миколаївська філія ДП «АМПУ» (РЕЙДИ)",                                "AMPU Mykolaiv (Roadstead)",      "SOE",                  "SOE"],
  ["ТОВ «МСП Ніка-Тера»",                                                 "MSP Nika-Tera",                  "Group DF",             "Group DF"],
  ["Філія «ДПЗКУ»",                                                       "DPZKU branch",                   "SOE",                  "SOE"],
  ["ТОВ «ОЙЛ ТРАНСШИПМЕНТ»",                                              "Oil Transshipment",              "",                     ""],
  ["ТОВ «Нікморсервіс-Ніколаєв»",                                         "Nikmorservice-Nikolaev",         "",                     ""],
  ["ТОВ Миколаївське підприємство «Термінал-Укрхарчозбутсировина»",       "Terminal-Ukrkharchozbut",        "",                     ""],
  ["ТОВ \"ТРІОНТА ПЛЮС\"",                                                "Trionta Plus",                   "",                     ""],
  ["ПАТ «Миколаївський суднобудівний завод «Океан»",                      "Mykolaiv Okean Shipyard",        "",                     ""],
  ["ТОВ \"Сервіс-Транс\"",                                                "Service-Trans",                  "",                     ""],
  ["ТОВ \"НЄК\"",                                                         "NEK",                            "",                     ""],
  ["ТОВ «Європейська Транспортна Стивідорна компанія»",                   "European Transport Stevedoring", "",                     ""],
  ["РП ТОВ \"Старк Шиппінг\"",                                            "Stark Shipping",                 "",                     ""],
  ["ТОВ «Старк Ейдженсі»",                                                "Stark Agency",                   "",                     ""],
  ["ТОВ \"ЮГ-ДОКЕР\"",                                                    "Yug-Docker",                     "",                     ""],
  ["ТОВ \"Наві Шиппінг\"",                                                "Navi Shipping",                  "",                     ""],
  ["ТОВ «Дніпро-Бузький Морський Термінал»",                              "Dnipro-Buzkyi Sea Terminal",     "",                     ""],

  // ── Pivdennyi (Південний) ───────────────────────────────────────────────
  ["ПАТ «ОПЗ»",                                                           "OPZ",                            "SOE",                  "SOE"],
  ["ТОВ з ІІ «ТРАНСІНВЕСТСЕРВІС»",                                        "Transinvestservice",             "TIS",                  "TIS"],
  ["ДП «МТП «Южний»",                                                     "Yuzhnyi MTP",                    "SOE",                  "SOE"],
  ["ТОВ \"ТЕРМІНАЛ СТИВІДОРІНГ І К\"",                                    "Terminal Stevedoring i K",       "",                     ""],
  ["ТОВ «БОРІВАЖ»",                                                       "Borivazh",                       "Kolomoyski",           "SOE"],
  ["ТОВ РИСОІЛ - ЮГ",                                                     "Risoil-Yug",                     "Risoil",               "Risoil"],
  ["ТОВ \"ОЛСІДЗ БЛЕК СІ\" ТРО",                                          "Allseeds Black Sea",             "Allseeds",             "Allseeds"],
  ["ТОВ «ДЕЛЬТА ВІЛМАР СНД»",                                             "Delta Wilmar",               "Wilmar",               "Wilmar"],
  ["ТОВ «ТІС-МІНДОБРИВА»",                                                "TIS Fertilizers",                "TIS",                  "TIS"],
  ["ТОВ «Мігтранс»",                                                      "Migtrans",                       "",                     ""],
  ["ДП «СІ САЙД»",                                                        "Sea Side",                       "",                     ""],
  ["МНК «ПІВДЕННИЙ»",                                                     "MNK Pivdennyi",                  "",                     ""],
  ["ТОВ \"ДІЛЕКС ТРАНСПОРТ\"",                                            "Dilex Transport",                "",                     ""],
  ["ТОВ \"М.В.КАРГО\"",                                                   "M.V.Cargo",                      "TIS",                  "TIS"],
  ["ТОВ \"СЕРВІС ТРАНС БАЛК\"",                                           "Service Trans Bulk",             "",                     ""],
  ["ТОВ \"ГРЕЙН-ТРАНСШИПМЕНТ\"",                                          "Grain Transshipment",            "",                     ""],
  ["ТОВ \"ТІС - РУДА\"",                                                  "TIS Ore",                        "TIS",                  "TIS"],
  ["ДП «МТП «Південний»",                                                 "Pivdennyi MTP",                  "SOE",                  "SOE"],
  ["ТОВ \"ТЕРМІНАЛ \"БОРІВАЖ\"",                                          "Borivazh",              "Kolomoyski",           "SOE"],
  ["ТОВ \"ДП ВОРЛД ТІС ПІВДЕННИЙ\"",                                      "TIS Container",         "TIS",                  "TIS"],
  ["АТ «ОПЗ»",                                                            "OPZ",                            "SOE",                  "SOE"],
  ["ТОВ \"ТІС - ВУГІЛЛЯ\"",                                               "TIS Coal",                       "TIS",                  "TIS"],
  ["ТОВ «САН ФЛАУЕР-ТЕРМІНАЛ»",                                           "Sun Flower",                     "",                     ""],
  ["ТОВ «ДЕЛЬТА ВІЛМАР УКРАЇНА»",                                         "Delta Wilmar",           "Wilmar",               "Wilmar"],
  ["ТОВ «ЕКО ТРІУМФ»",                                                    "Eko Triumf",                     "",                     ""],
  ["ТОВ \"ТІС - ЗЕРНО\"",                                                 "TIS Grain",                      "TIS",                  "TIS"],
  ["ТОВ \"ТІС - 24 ПРИЧАЛ\"",                                             "TIS Berth 24",                   "TIS",                  "TIS"],
  ["ТОВ \"ПЕРША ОДЕСЬКА ТОРГІВЕЛЬНА КОМПАНІЯ\"",                          "First Odesa Trading Co",         "",                     ""],
  ["ПО (відсутній)",                                                      "PO (none)",                      "",                     ""],
  ["ТОВ «ТІС-15 ПРИЧАЛ»",                                                 "TIS Berth 15",                   "TIS",                  "TIS"],
  ["ТОВ \"МАРШАЛ ГРУП КОРПОРАЦІЯ\"",                                      "Marshall Group Corp",            "",                     ""],
  ["ТОВ \"ТЕРМІНАЛ СТІВІДОРІНГ І К\"",                                    "Terminal Stevidoring i K",       "",                     ""],
  ["ТОВ «БЛЕК СІ ОІЛ ТЕРМІНАЛ»",                                          "Black Sea Oil Terminal",         "",                     ""],
  ["ТОВ \"КОНТЕЙНЕРНИЙ ТЕРМІНАЛ ПІВДЕННИЙ\"",                             "TIS Container",                  "TIS",                  "TIS"],

  // ── Ust-Dunaisk ─────────────────────────────────────────────────────────
  ["ДП «МТП Усть-Дунайськ»",                                              "Ust-Dunaisk MTP",                "SOE",                  "SOE"],
  ["ТОВ \"Краншип\"",                                                     "Kranship",                       "",                     ""],
  ["ТОВ «ЛАД»",                                                           "LAD",                            "",                     ""],
  ["ТОВ «КОВ КОМЕРС»",                                                    "KOV Commerce",                   "",                     ""],
  ["ТОВ \"ЗЕРНОВИЙ ТЕРМІНАЛ КІЛІЯ\"",                                     "Kiliya Grain Terminal",          "",                     ""],
  ["ПрАТ «УДП»",                                                          "UDP",                            "SOE",                  "SOE"],
  ["ТОВ «ПТВ»",                                                           "PTV",                            "",                     ""],
  ["ТОВ \"Вімексім Логістік\"",                                           "Vimexim Logistic",               "",                     ""],

  // ── Chornomorsk ─────────────────────────────────────────────────────────
  ["Морський торговельний порт \"Чорноморськ\"",                          "Chornomorsk MTP",                "SOE",                  "SOE"],
  ["ТОВ «Іллічівський Зерновий термінал»",                                "Illichivsk Grain Terminal",      "Bunge / Viterra",      "Bunge / Viterra"],
  ["Морська адміністрація Чорноморського рибного порту",                  "Chornomorsk Fishing Port Admin", "SOE",                  "SOE"],
  ["ПАТ «Олір Ресорсіз»",                                                 "Olir Resources",                 "",                     ""],
  ["СП ТОВ «ТрансБалкТерминал»",                                          "TransBulkTerminal",              "Kernel",               "Kernel"],
  ["ПАТ «Іллічівський паливний термінал»",                                "Illichivsk Fuel Terminal",       "",                     ""],
  ["ТОВ «СП Рісоіл термінал»",                                            "Risoil Terminal",                "Risoil",               "Risoil"],
  ["ТОВ «Фрамшиппінг»",                                                   "Framshipping",                   "Fram Shipping",        "Fram Shipping"],
  ["ТОВ \"Транс-Сервіс\"",                                                "Trans-Service",                  "",                     ""],
  ["ТОВ \"Европіан Агро Інвестмент Юкрейн\"",                             "European Agro Investment UA",    "",                     ""],
  ["ТОВ \"Ренді\"",                                                       "Rendy",                          "",                     ""],
  ["ТОВ \"ЕКО-РЕСУРС-ХОЛДИНГ\"",                                          "Eco-Resource-Holding",           "",                     ""],
  ["ТОВ «Чорноморська Стивідорна Компанія»",                              "Chornomorsk Stevedoring Co",     "",                     ""],
  ["ТЕК-ТРАНС ГРУП «ФОРВАРД»",                                            "TEK-Trans Forward",              "",                     ""],
  ["ТОВ \"Автологістика\"",                                               "Avtologistika",                  "",                     ""],
  ["ТОВ «СЗТЧ»",                                                          "SZTCh",                          "",                     ""],
  ["ПП «Контейнерний термінал Іллічівськ»",                               "Illichivsk Container Terminal",  "SOE",                  "SOE"],
  ["ВЛАДІ - ТРАНС",                                                       "Vladi-Trans",                    "",                     ""],
  ["Транс-Сервіс",                                                        "Trans-Service",                  "",                     ""],
  ["ПАТ «Чорноморський паливний термінал»",                               "Chornomorsk Fuel Terminal",      "Kiperman",             "Kiperman"],
  ["ЧСК",                                                                 "ChSK",                           "",                     ""],
  ["ТОВ «Хім -Ойл-Транзит-Юкрейн»",                                       "Chem-Oil-Transit-Ukraine",       "",                     ""],
  ["АРКОН-ТРАНС",                                                         "Arkon-Trans",                    "",                     ""],
  ["РИСОІЛ РУДА",                                                         "Risoil-Ore",                     "Risoil",               "Risoil"],
  ["ЛОГОТРЕЙДГРУП",                                                       "LogoTradeGroup",                 "",                     ""],
  ["СВ",                                                                  "SV",                             "",                     ""],
  ["Компанія Крентон Україна",                                            "Crenton Ukraine",                "",                     ""],
  ["РИСОІЛ універсальний термінал",                                       "Risoil Universal Terminal",      "Risoil",               "Risoil"],
  ["ТГТ",                                                                 "TGT",                            "Kernel",               "Kernel"],
  ["ІСРЗ",                                                                "ISRZ",                           "",                     ""],
  ["ПОРТ-СЕРВІС",                                                         "Port-Service",                   "",                     ""],
  ["Рісоіл ПІРС",                                                         "Risoil Pier",                    "Risoil",               "Risoil"],
  ["Рісоіл ПІРС(власні причали)",                                         "Risoil Pier (own berths)",       "Risoil",               "Risoil"],
  ["ТРАЙГОН-ЕКСПОРТ",                                                     "Trigon-Export",                  "",                     ""],
  ["ДП МТП \"Чорноморськ\"",                                              "Chornomorsk MTP",                "SOE",                  "SOE"],
  ["ТОВ \"Чорноморський рибний порт\"",                                   "Chornomorsk Fishing Port",       "Kolomoyski",           "SOE"],
  ["ТРАНС-АГРО",                                                          "Trans-Agro",                     "",                     ""],

  // ── Odesa ───────────────────────────────────────────────────────────────
  ["ДП \"КТО\"",                                                          "CTO Container Terminal",         "HHLA",                 "HHLA"],
  ["ТОВ \"Олімпекс Купе Інт.\"",                                          "Olimpex Coupe Int",              "Olimpex",              "Olimpex"],
  ["ТОВ \"Новолог\"",                                                     "Novolog",                        "Novolog",              "Novolog"],
  ["ТОВ \"Бруклін Київ-Порт\"",                                           "Brooklyn Kyiv-Port",             "Brooklyn",             "Brooklyn"],
  ["ТОВ \"ОВППК\"",                                                       "OVPPK",                          "",                     ""],
  ["ПАТ з ІІ \"Синтез Ойл\"",                                             "Synthesis Oil",                  "Kiperman",             "Kiperman"],
  ["Морський вокзал АОМП",                                                "Marine Terminal AOMP",           "",                     ""],
  ["ТОВ \"Бруклін Київ\"",                                                "Brooklyn Kyiv",                  "Brooklyn",             "Brooklyn"],
  ["ТОВ \"Одеський портовий холодильник\"",                               "Odesa Port Cold Storage",        "",                     ""],
  ["ПрАТ \"Укрелеваторпром\"",                                            "Ukrelevatorprom",                "Brooklyn",             "Brooklyn"],
  ["ТОВ \"УНСК\"",                                                        "UNSK",                           "",                     ""],
  ["ТОВ \"Металзюкрейн Корп Лтд\"",                                       "Metalzukraine Corp",             "Olimpex",              "Olimpex"],
  ["ТОВ \"Новотех-Термінал\"",                                            "Novotech-Terminal",              "Novotech",             "Novotech"],
  ["ПП \"ПОРТО-САН\"",                                                    "Porto-San",                      "",                     ""],
  ["ТВТ АОМП",                                                            "TVT AOMP",                       "",                     ""],
  ["ПАТ \"ДПЗКУ\" ОЗТ",                                                   "DPZKU OZT",                      "SOE",                  "SOE"],
  ["ТОВ «ПК АМ»",                                                         "PK AM",                          "",                     ""],
  ["ТОВ \"ЄВТ\"",                                                         "YeVT",                           "",                     ""],
  ["ТОВ \"САНМОБІЛ\"",                                                    "Sanmobil",                       "",                     ""],
  ["ДПКЗУ ОЗТ",                                                           "DPZKU OZT",                      "SOE",                  "SOE"],
  ["Рейд Одеської філії",                                                 "Odesa branch roadstead",         "",                     ""],
  ["ДП \"Пріста Ойл Україна\"",                                           "Prista Oil Ukraine",             "Olimpex",              "Olimpex"],
  ["ТОВ «Аттолло Гранум»",                                                "Attolo Granum",                  "",                     ""],
  ["МВ",                                                                  "MV",                             "",                     ""],
  ["TOB \"КОНТЕЙНЕР ЕКСПЕРТ\"",                                           "Container Expert",               "",                     ""],

  // ── Reni ────────────────────────────────────────────────────────────────
  ["ПП «Рені-Ліс»",                                                       "Reni-Lis",                       "",                     ""],
  ["ТОВ «СК Аккорд»",                                                     "SK Accord",                      "",                     ""],
  ["ДП «Ренійский МТП»",                                                  "Reni MTP",                       "SOE",                  "SOE"],
  ["ПрАТ «Ренійський Элеватор»",                                          "Reni Elevator",                  "",                     ""],
  ["ТОВ \"АГРО РЕНІ\"",                                                   "Agro Reni",                      "",                     ""],
  ["ТОВ «Рені-Лайн»",                                                     "Reni-Line",                      "",                     ""],
  ["ПП «Ларус Шиппінг»",                                                  "Larus Shipping",                 "",                     ""],
  ["ПП \"ТРАНС-ЕКСПО\"",                                                  "Trans-Expo",                     "",                     ""],
  ["ТОВ «Термінал Дунай»",                                                "Danube Terminal",                "",                     ""],
  ["ТОВ \"УКРЧЕМ\"",                                                      "Ukrchem",                        "",                     ""],
  ["ТОВ «Рені-Термінал»",                                                 "Reni-Terminal",                  "",                     ""],
  ["ТОВ \"Дунай Пром Арго\"",                                             "Danube Prom Argo",               "",                     ""],
  ["ТОВ «БІО-ЛАЙН-РЕНІ»",                                                 "Bio-Line-Reni",                  "",                     ""],
  ["ТОВ РП \"ОРЛІВКА\"",                                                  "Orlivka",                        "",                     ""],
  ["ТОВ «МЕРІТАЙМ КАРГО СЕРВІС»",                                         "Maritime Cargo Service",         "",                     ""],
  ["ТОВ \"ЛОДЖИСТЛІ\"",                                                   "Logistly",                       "",                     ""],
  ["ТОВ «ДУНАЙ-ТРАНЗИТСЕРВІС»",                                           "Danube-TransitService",          "",                     ""],
  ["ТОВ \"ПОТОКИ\"",                                                      "Potoky",                         "",                     ""],
  ["ТДВ «Ренійський Элеватор»",                                           "Reni Elevator",                  "",                     ""],
  ["ПП \"ЕТМК\"",                                                         "ETMK",                           "",                     ""],
  ["ТОВ \"ВІКІНГ АЛЬЯНС\"",                                               "Viking Alliance",                "",                     ""],
  ["ТОВ \"DLG\"",                                                         "DLG",                            "",                     ""],

  // ── Skadovsk ────────────────────────────────────────────────────────────
  ["ДП «Скадовський МТП»",                                                "Skadovsk MTP",                   "",                     ""],
  ["ТОВ \"СОФІЯ-1 ПЛЮС\"",                                                "Sofia-1 Plus",                   "",                     ""],

  // ── Olvia ───────────────────────────────────────────────────────────────
  ["ДП СK «Ольвія»",                                                      "Olvia SC",                       "SOE",                  "SOE"],
  ["ТОВ \"Компанія \"Євровнєшторг\"",                                     "Eurovneshtorg",                  "Novus",                "Novus"],
  ["ТОВ \"Кютерминалз Ольвія\"",                                          "QTerminals Olvia",               "SOE",                  "QTerminals"],

  // ── Kherson ─────────────────────────────────────────────────────────────
  ["ПАТ «Херсонський КХП»",                                               "Kherson KHP",                    "",                     ""],
  ["ПАТ СК \"Укррічфлот\" \"ХРП\" (з 2013р., причали ХМТП)",              "Ukrrichflot KhRP",               "Ukrrichflot",          "Ukrrichflot"],
  ["ГВСП Термінал ПАТ ХСЗ",                                               "KhSZ Terminal",                  "",                     ""],
  ["ДП «Херсонський МТП»",                                                "Kherson MTP",                    "SOE",                  "SOE"],
  ["Компанія «Дніпро Карго Лімітед»",                                     "Dnipro Cargo Ltd",               "",                     ""],
  ["ХП ДП ІЗНП",                                                          "KhP DP IZNP",                    "",                     ""],
  ["Херсонська філія ДП \"АМПУ\" РЕЙДИ, ПРИЧАЛИ",                         "AMPU Kherson",                   "SOE",                  "SOE"],
  ["ХДЗ \"Палада\"",                                                      "KhDZ Palada",                    "",                     ""],
  ["ПрАТ \"Дніпровський термінал\"",                                      "Dnipro Terminal",                "",                     ""],
  ["ТОВ \"Вторметекспорт\"",                                              "Vtormetexport",                  "",                     ""],
  ["ТОВ «Херсонес»",                                                      "Khersones",                      "",                     ""],
  ["ТОВ «Херсонський порт»",                                              "Kherson Port",                   "",                     ""],
];

export const terminalNames     = new Map(terminals.map(([uk, en])      => [uk, en]));
export const terminalGroup1Map = new Map(terminals.map(([uk, , g1])    => [uk, g1 || null]));
export const terminalGroup2Map = new Map(terminals.map(([uk, , , g2])  => [uk, g2 || null]));

// Fallback to the raw Ukrainian string for any terminal not in the table.
export const toTerminal = uk => terminalNames.get(uk) ?? uk;

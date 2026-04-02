// "use client";

// import React, { useCallback, useState } from "react";
// import dynamic from "next/dynamic";
// import {
//   ArrowRight,
//   BookPlus,
//   ShieldCheck,
//   Tags,
// } from "lucide-react";
// import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
// import { isAdminTelegramId } from "@/lib/admins";
// import { AppSurface } from "@/app/components/ui/AppSurface";
// import { Button } from "@/app/components/ui/button";

// const loadAddVerseDialogModule = () => import("./AddVerseDialog");

// const AddVerseDialog = dynamic(
//   () => loadAddVerseDialogModule().then((m) => m.AddVerseDialog),
//   {
//     ssr: false,
//     loading: () => null,
//   },
// );

// type VerseAddPayload = {
//   externalVerseId: string;
//   reference: string;
//   tags: string[];
//   replaceTags?: boolean;
// };

// type AdminProps = {
//   telegramId?: string | null;
//   onVerseAdded: (verse: VerseAddPayload) => Promise<void>;
//   onCatalogMutated?: () => void;
//   accessMode?: "restricted" | "open";
// };

// const ADMIN_ACTIONS = [
//   {
//     id: "verse" as const,
//     title: "Новый стих",
//     description:
//       "Добавление нового стиха в коллекцию пользователя с проверкой каталога и текущих тегов.",
//     cta: "Добавить стих",
//     icon: BookPlus,
//   },
//   {
//     id: "tag" as const,
//     title: "Теги",
//     description:
//       "Создание, переименование и удаление тегов в одном административном потоке.",
//     cta: "Управлять тегами",
//     icon: Tags,
//   },
// ] as const;

// export function Admin({
//   telegramId = null,
//   onVerseAdded,
//   onCatalogMutated,
//   accessMode = "restricted",
// }: AdminProps) {
//   const hasAdminAccess =
//     accessMode === "open" || isAdminTelegramId(telegramId);
//   const isOpenAccess = accessMode === "open";
//   const [dialogMode, setDialogMode] = useState<"verse" | "tag" | null>(null);

//   const handleCloseDialog = useCallback(() => {
//     setDialogMode(null);
//   }, []);

//   const handleOpenVerseDialog = useCallback(() => {
//     setDialogMode("verse");
//   }, []);

//   const handleOpenTagDialog = useCallback(() => {
//     setDialogMode("tag");
//   }, []);

//   const prefetchDialog = useCallback(() => {
//     void loadAddVerseDialogModule();
//   }, []);

//   useTelegramBackButton({
//     enabled: dialogMode !== null,
//     onBack: handleCloseDialog,
//     priority: 40,
//   });

//   if (!hasAdminAccess) {
//     return null;
//   }

//   return (
//     <>
//       <section className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-3 px-3 py-3 sm:px-4 lg:px-5">
//         <AppSurface className="overflow-hidden">
//           <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
//             <div className="max-w-2xl space-y-3">
//               <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary">
//                 <ShieldCheck className="h-3.5 w-3.5" />
//                 {isOpenAccess
//                   ? "Временный открытый доступ"
//                   : "Доступ только для администраторов"}
//               </span>
//               <div className="space-y-2">
//                 <h1 className="text-primary">Админка</h1>
//                 <p className="max-w-xl text-sm leading-6 text-text-secondary">
//                   {isOpenAccess
//                     ? "Отдельное приложение для управления каталогом стихов и тегами. Сейчас доступ открыт без проверки admin-прав."
//                     : "Отдельный рабочий поток для управления каталогом стихов и тегами без смешивания с пользовательским экраном списка."}
//                 </p>
//               </div>
//             </div>

//             <div className="grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
//               <div className="rounded-2xl border border-border-subtle bg-bg-elevated/70 px-4 py-3">
//                 Создание и проверка стихов
//               </div>
//               <div className="rounded-2xl border border-border-subtle bg-bg-elevated/70 px-4 py-3">
//                 {isOpenAccess ? "Открытый режим без проверок" : "Полное управление тегами"}
//               </div>
//             </div>
//           </div>
//         </AppSurface>

//         <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
//           {ADMIN_ACTIONS.map((action) => {
//             const Icon = action.icon;
//             const handleOpen =
//               action.id === "verse" ? handleOpenVerseDialog : handleOpenTagDialog;

//             return (
//               <AppSurface
//                 key={action.id}
//                 className="justify-between gap-5 border-border-subtle/90"
//               >
//                 <div className="space-y-4">
//                   <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-primary/20 bg-brand-primary/10 text-brand-primary">
//                     <Icon className="h-5 w-5" />
//                   </div>
//                   <div className="space-y-2">
//                     <h2 className="text-lg font-semibold tracking-tight text-text-primary">
//                       {action.title}
//                     </h2>
//                     <p className="text-sm leading-6 text-text-secondary">
//                       {action.description}
//                     </p>
//                   </div>
//                 </div>

//                 <Button
//                   type="button"
//                   variant="outline"
//                   onClick={handleOpen}
//                   onPointerEnter={prefetchDialog}
//                   onFocus={prefetchDialog}
//                   className="h-11 w-full justify-between rounded-2xl border-border/70 bg-bg-elevated/80 px-4 text-text-primary"
//                 >
//                   <span>{action.cta}</span>
//                   <ArrowRight className="h-4 w-4" />
//                 </Button>
//               </AppSurface>
//             );
//           })}
//         </div>
//       </section>

//       <AddVerseDialog
//         open={dialogMode !== null}
//         mode={dialogMode ?? "verse"}
//         viewerTelegramId={telegramId}
//         adminAccessEnabled={!isOpenAccess}
//         onClose={handleCloseDialog}
//         onAdd={onVerseAdded}
//         onCatalogMutated={onCatalogMutated}
//       />
//     </>
//   );
// }

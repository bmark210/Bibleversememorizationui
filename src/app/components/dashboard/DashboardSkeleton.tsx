// 'use client'

// import React from 'react'
// import { Card } from '../ui/card'
// import { Skeleton } from '../ui/skeleton'

// export function DashboardSkeleton() {
//   const shellClassName =
//     'rounded-3xl border border-border/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]'

//   return (
//     <>
//       <div className="mb-8">
//         <div className="flex items-center gap-4 mb-4">
//           <Skeleton className="h-16 w-16 rounded-full" />
//           <div className="space-y-2 w-full max-w-xs">
//             <Skeleton className="h-6 w-48" />
//             <Skeleton className="h-4 w-36" />
//           </div>
//         </div>
//         <Skeleton className="h-4 w-80 max-w-full" />
//       </div>

//       <div className="mb-5">
//         <Card className={`${shellClassName} p-5 sm:p-6`}>
//           <div className="space-y-4">
//             <div className="space-y-2">
//               <Skeleton className="h-6 w-36 rounded-full" />
//               <Skeleton className="h-7 w-64" />
//               <Skeleton className="h-4 w-full max-w-2xl" />
//             </div>
//             <div className="rounded-2xl border border-border/45 bg-gradient-to-br from-card/80 to-card/60 p-4 sm:p-5 space-y-3.5">
//               <div className="flex items-center justify-between gap-3">
//                 <Skeleton className="h-4 w-36" />
//                 <Skeleton className="h-4 w-24" />
//               </div>
//               <Skeleton className="h-2.5 w-full rounded-full" />
//               <Skeleton className="h-20 w-full rounded-xl" />
//             </div>
//             <Skeleton className="h-11 w-full sm:w-52 rounded-2xl" />
//           </div>
//         </Card>
//       </div>

//       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
//         <Card className={`${shellClassName} p-5 sm:p-6`}>
//           <div className="space-y-3.5">
//             <Skeleton className="h-6 w-44 rounded-full" />
//             <Skeleton className="h-4 w-64" />
//             <Skeleton className="h-36 w-full rounded-2xl" />
//             <Skeleton className="h-2.5 w-full rounded-full" />
//           </div>
//         </Card>
//         <Card className={`${shellClassName} p-5 sm:p-6`}>
//           <div className="space-y-3.5">
//             <Skeleton className="h-6 w-40 rounded-full" />
//             <Skeleton className="h-4 w-56" />
//             <Skeleton className="h-24 w-full rounded-2xl" />
//             <Skeleton className="h-24 w-full rounded-2xl" />
//           </div>
//         </Card>
//       </div>
//     </>
//   )
// }

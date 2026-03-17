
'use client';

import { useEffect, useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { getLedgerEntries, type LedgerEntry, LEDGER_STORAGE_KEY } from '@/lib/ledger';

const LedgerChart = memo(({ data }: { data: any[] }) => {
  const chartConfig = {
    balance: {
      label: 'Credits',
      color: '#000000',
    },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col border-none bg-background p-0">
      <div className="h-[220px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full shadow-none">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              top: 5,
              right: 20,
              left: 0,
              bottom: 5,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="#000000" opacity={0.1} />
            <XAxis
              dataKey="index"
              axisLine={{ stroke: '#000000', strokeWidth: 1 }}
              tickLine={false}
              tickMargin={12}
              tick={{ fontSize: 10, fill: '#000000', fontWeight: 400 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={35}
              tick={{ fontSize: 9, fill: '#000000' }}
            />
            <ChartTooltip
              cursor={{ stroke: '#000000', strokeWidth: 1 }}
              content={<ChartTooltipContent indicator="line" labelFormatter={(value) => `Dataset #${value}`} />}
            />
            <Line
              dataKey="balance"
              type="monotone"
              stroke="#000000"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </div>
      <p className="mt-4 text-[9px] text-[#000000] uppercase tracking-[0.2em] font-medium">Cumulative Credit Index</p>
    </div>
  );
});
LedgerChart.displayName = 'LedgerChart';

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const updateEntries = () => {
      const allEntries = getLedgerEntries();
      const sorted = allEntries
        .sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return a.id.localeCompare(b.id);
        })
        .map(e => {
          const entry = { ...e };
          if (entry.credits === undefined || entry.credits === null) {
            entry.credits = 0;
          }
          if (typeof entry.credits !== 'number' || !Number.isFinite(entry.credits)) {
            entry.credits = 0;
          }
          if (typeof entry.cumulativeCredits !== 'number' || !Number.isFinite(entry.cumulativeCredits)) {
             entry.cumulativeCredits = 0;
          }
          return entry;
        });
      setEntries(sorted);
    };
    
    updateEntries();
    setIsClient(true);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LEDGER_STORAGE_KEY) {
        updateEntries();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleRowClick = (id: string) => {
    router.push(`/report?id=${id}`);
  };

  if (!isClient) {
    return null;
  }

  const chartData = entries.map((entry, index) => ({
    index: index + 1,
    balance: entry.cumulativeCredits || 0,
  }));

  const finalBalance = entries.length > 0 ? (entries[entries.length - 1].cumulativeCredits || 0) : 0;

  return (
    <div className="space-y-16 py-4 bg-background min-h-screen">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#000000]">
            Ledger
          </h1>
          <p className="text-sm text-[#000000] max-w-[600px] leading-relaxed">
            Historical record of validated movement credits and cumulative ledger accumulation.
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="border-t border-border pt-12 text-center">
          <p className="text-[10px] uppercase tracking-widest font-medium text-[#000000]">No activity recorded</p>
        </div>
      ) : (
        <div className="space-y-24">
          <section className="space-y-8">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#000000]">Trend Analysis</h2>
            <LedgerChart data={chartData} />
          </section>

          <section className="space-y-8">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#000000]">Audit Entries</h2>
            <div className="border-t border-border w-full overflow-hidden">
              <Table className="w-full table-fixed">
                <TableHeader className="bg-transparent">
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="w-[35px] text-[10px] uppercase tracking-wider h-10 px-2 text-[#000000]">#</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider h-10 px-2 text-[#000000]">Dataset</TableHead>
                    <TableHead className="w-[70px] text-[10px] uppercase tracking-wider h-10 px-2 text-[#000000]">Profile</TableHead>
                    <TableHead className="text-right text-[10px] uppercase tracking-wider h-10 w-[75px] px-2 text-[#000000]">Total Time</TableHead>
                    <TableHead className="text-right text-[10px] uppercase tracking-wider h-10 w-[85px] px-2 text-[#000000]">Validated</TableHead>
                    <TableHead className="text-right text-[10px] uppercase tracking-wider h-10 w-[85px] px-2 text-[#000000]">Credits</TableHead>
                    <TableHead className="text-right text-[10px] uppercase tracking-wider h-10 w-[110px] px-2 text-[#000000]">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => {
                    const totalSec = entry.totalSeconds || 1;
                    const validatedSec = entry.validatedSeconds || 0;
                    const eligibility = ((validatedSec / totalSec) * 100).toFixed(1);
                    const totalMin = (totalSec / 60).toFixed(1);
                    const validatedMin = entry.validatedMinutes !== undefined ? entry.validatedMinutes.toFixed(1) : (validatedSec / 60).toFixed(1);
                    
                    return (
                      <TableRow
                        key={entry.id}
                        onClick={() => handleRowClick(entry.id)}
                        className="cursor-pointer border-b border-border hover:bg-muted/5 transition-colors group"
                      >
                        <TableCell className="text-[11px] text-[#000000] font-medium px-2 tabular-nums">{index + 1}</TableCell>
                        <TableCell className="text-[11px] font-normal text-[#000000] px-2 py-4">
                          <div className="break-words line-clamp-2" title={entry.activityLabel}>
                            {entry.activityLabel}
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] text-[#000000] font-medium px-2">Human</TableCell>
                        <TableCell className="text-right text-[11px] tabular-nums text-[#000000] px-2 whitespace-nowrap">
                          {totalMin}m
                        </TableCell>
                        <TableCell className="text-right text-[11px] tabular-nums text-[#000000] px-2 whitespace-nowrap">
                          <div className="font-medium">{validatedMin}m</div>
                          <div className="text-[9px] text-[#000000] font-normal mt-0.5">
                            {eligibility}%
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-[11px] tabular-nums text-[#000000] px-2 whitespace-nowrap">
                          <div className="font-medium">{(entry.credits !== undefined ? entry.credits : (entry.finalCredits || 0)).toFixed(4)}</div>
                        </TableCell>
                        <TableCell className="text-right text-[11px] font-bold tabular-nums text-[#000000] px-2 whitespace-nowrap">
                          {(entry.cumulativeCredits || 0).toFixed(4)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter className="bg-transparent border-t border-border">
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-right text-[10px] uppercase tracking-wider font-semibold text-[#000000] px-2 py-6">Final Total Balance</TableCell>
                    <TableCell className="text-right text-[11px] font-bold tabular-nums text-[#000000] px-2 whitespace-nowrap">
                      {(finalBalance || 0).toFixed(4)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

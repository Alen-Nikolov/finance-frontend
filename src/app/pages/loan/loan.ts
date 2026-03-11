import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ExtraOneTime = {
  month: number; // 1-based
  amount: number;
};

type Row = {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  extra: number;
  balance: number;
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

@Component({
  selector: 'app-loan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loan.html',
  styleUrl: './loan.scss',
})
export class Loan {
  // inputs
  principal = signal<number>(10000);
  annualRate = signal<number>(5);
  termMonths = signal<number>(36);

  extraMonthly = signal<number>(0);
  oneTimeMonth = signal<number>(1);
  oneTimeAmount = signal<number>(0);

  readonly oneTimes = signal<ExtraOneTime[]>([]);
  readonly view = signal<'table' | 'graph'>('table');

  readonly hover = signal<null | { leftPx: number; topPx: number; title: string; value: number; month: number }>(
    null,
  );

  readonly donutHover = signal<null | { leftPx: number; topPx: number; title: string }>(null);

  private readonly chartWidth = 900;
  private readonly chartHeight = 320;
  private readonly padX = 40;
  private readonly padY = 18;

  readonly schedule = computed<Row[]>(() => {
    const P0 = Math.max(0, Number(this.principal()) || 0);
    const annual = Math.max(0, Number(this.annualRate()) || 0);
    const n = Math.max(1, Math.floor(Number(this.termMonths()) || 1));

    const extraM = Math.max(0, Number(this.extraMonthly()) || 0);
    const oneTimes = this.oneTimes();

    const r = annual / 100 / 12;

    // Standard payment for amortizing loan
    const payment =
      r === 0 ? P0 / n : (P0 * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);

    let balance = P0;
    const rows: Row[] = [];

    for (let month = 1; month <= n; month++) {
      if (balance <= 0) break;

      const interest = r === 0 ? 0 : balance * r;
      // Adjust final payment so we don't overpay in the last month
      const scheduledPayment = Math.min(payment, interest + balance);
      let principalPay = scheduledPayment - interest;
      if (principalPay < 0) principalPay = 0;

      const oneTimeExtra = oneTimes
        .filter((x) => x.month === month)
        .reduce((sum, x) => sum + x.amount, 0);

      let extra = extraM + oneTimeExtra;

      // Don’t overpay beyond remaining balance + interest for the month
      const maxPrincipalThisMonth = balance;
      if (principalPay > maxPrincipalThisMonth) principalPay = maxPrincipalThisMonth;
      if (principalPay + extra > maxPrincipalThisMonth) extra = maxPrincipalThisMonth - principalPay;

      const newBalance = balance - principalPay - extra;

      rows.push({
        month,
        payment: round2(scheduledPayment),
        interest: round2(interest),
        principal: round2(principalPay),
        extra: round2(extra),
        balance: round2(Math.max(0, newBalance)),
      });

      balance = newBalance;
    }

    return rows;
  });

  readonly totals = computed(() => {
    const rows = this.schedule();
    const totalPayment = rows.reduce((s, r) => s + r.payment, 0);
    const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
    const totalExtra = rows.reduce((s, r) => s + r.extra, 0);
    const months = rows.length;
    return {
      months,
      totalPayment: round2(totalPayment),
      totalInterest: round2(totalInterest),
      totalExtra: round2(totalExtra),
    };
  });

  readonly donut = computed(() => {
    const principal = Math.max(0, Number(this.principal()) || 0);
    const interest = this.totals().totalInterest;
    const total = principal + interest;
    const interestPct = total === 0 ? 0 : (interest / total) * 100;
    const principalPct = 100 - interestPct;

    // Use pathLength=100 so dasharray is in percentages
    return {
      principal,
      interest,
      total,
      interestPct: round2(interestPct),
      principalPct: round2(principalPct),
    };
  });

  readonly chart = computed(() => {
    const rows = this.schedule();
    const width = this.chartWidth;
    const height = this.chartHeight;
    const innerW = width - this.padX * 2;
    const innerH = height - this.padY * 2;

    const maxBalance = Math.max(0, ...rows.map((r) => r.balance));
    let runningPaid = 0;
    let runningInterest = 0;
    const cumulative = rows.map((r) => {
      // "Total paid" includes scheduled payment + any extra payment applied that month
      runningPaid += r.payment + r.extra;
      runningInterest += r.interest;
      return {
        month: r.month,
        totalPaid: round2(runningPaid),
        totalInterest: round2(runningInterest),
      };
    });

    const maxPayInt = Math.max(
      0,
      ...cumulative.map((r) => Math.max(r.totalPaid, r.totalInterest)),
    );

    const xAt = (i: number) => {
      const t = rows.length <= 1 ? 0 : i / (rows.length - 1);
      return this.padX + t * innerW;
    };

    const yBalanceAt = (balance: number) =>
      this.padY + (maxBalance === 0 ? innerH : (1 - balance / maxBalance) * innerH);

    const yPayIntAt = (v: number) =>
      this.padY + (maxPayInt === 0 ? innerH : (1 - v / maxPayInt) * innerH);

    const pointsBalance = rows.map((r, i) => {
      const t = rows.length <= 1 ? 0 : i / (rows.length - 1);
      const x = this.padX + t * innerW;
      const y = yBalanceAt(r.balance);
      return { x, y, month: r.month, value: r.balance };
    });

    const buildPath = (pts: { x: number; y: number }[]) =>
      pts.length === 0
        ? ''
        : `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} ` +
          pts
            .slice(1)
            .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
            .join(' ');

    const pointsPayment = cumulative.map((r, i) => ({
      x: xAt(i),
      y: yPayIntAt(r.totalPaid),
      month: r.month,
      value: r.totalPaid,
    }));

    const pointsInterest = cumulative.map((r, i) => ({
      x: xAt(i),
      y: yPayIntAt(r.totalInterest),
      month: r.month,
      value: r.totalInterest,
    }));

    const ticksX = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      x: this.padX + t * innerW,
      label:
        rows.length === 0
          ? ''
          : String(rows[Math.round(t * (rows.length - 1))]?.month ?? ''),
    }));

    const ticksYLeft = [0, 0.5, 1].map((t) => ({
      y: this.padY + t * innerH,
      label: round2(maxBalance * (1 - t)).toLocaleString(),
    }));

    const ticksYRight = [0, 0.5, 1].map((t) => ({
      y: this.padY + t * innerH,
      label: round2(maxPayInt * (1 - t)).toLocaleString(),
    }));

    return {
      width,
      height,
      pointsBalance,
      pointsPayment,
      pointsInterest,
      pathBalance: buildPath(pointsBalance),
      pathPayment: buildPath(pointsPayment),
      pathInterest: buildPath(pointsInterest),
      ticksX,
      ticksYLeft,
      ticksYRight,
      maxBalance,
      maxPayInt,
    };
  });

  addOneTime() {
    const month = Math.max(1, Math.floor(Number(this.oneTimeMonth()) || 1));
    const amount = Math.max(0, Number(this.oneTimeAmount()) || 0);
    if (!amount) return;

    this.oneTimes.update((list) => [...list, { month, amount }].sort((a, b) => a.month - b.month));
    this.oneTimeAmount.set(0);
  }

  removeOneTime(index: number) {
    this.oneTimes.update((list) => list.filter((_, i) => i !== index));
  }

  showHover(
    e: MouseEvent,
    container: HTMLElement,
    title: string,
    month: number,
    value: number,
  ) {
    const rect = container.getBoundingClientRect();
    const leftPx = Math.min(rect.width - 12, Math.max(12, e.clientX - rect.left + 12));
    const topPx = Math.min(rect.height - 12, Math.max(12, e.clientY - rect.top + 12));
    this.hover.set({ leftPx, topPx, title, month, value });
  }

  moveHover(e: MouseEvent, container: HTMLElement) {
    const current = this.hover();
    if (!current) return;
    this.showHover(e, container, current.title, current.month, current.value);
  }

  hideHover() {
    this.hover.set(null);
  }

  showDonutHover(e: MouseEvent, container: HTMLElement, title: string) {
    const rect = container.getBoundingClientRect();
    const leftPx = Math.min(rect.width - 12, Math.max(12, e.clientX - rect.left + 12));
    const topPx = Math.min(rect.height - 12, Math.max(12, e.clientY - rect.top + 12));
    this.donutHover.set({ leftPx, topPx, title });
  }

  hideDonutHover() {
    this.donutHover.set(null);
  }
}


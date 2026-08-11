import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  aplicarTolerancia,
  minutosParaDate,
  tipoParaHorarioPrevisto,
  tipoParaTolerancia,
  isDiaUtil,
} from "../../../utils/toleranceCalculator.js";

describe("toleranceCalculator", () => {
  describe("aplicarTolerancia", () => {
    it("deve retornar horário previsto quando atraso está dentro da tolerância", () => {
      const horarioPrevisto = new Date("2026-08-10T08:00:00");
      const horarioReal = new Date("2026-08-10T08:03:00"); // +3 min

      const result = aplicarTolerancia(horarioReal, horarioPrevisto, 5);

      expect(result.horarioEfetivo).toEqual(horarioPrevisto);
      expect(result.dentroDaTolerancia).toBe(true);
      expect(result.minutosExcedentes).toBe(0);
    });

    it("deve retornar horário real quando atraso excede tolerância", () => {
      const horarioPrevisto = new Date("2026-08-10T08:00:00");
      const horarioReal = new Date("2026-08-10T08:10:00"); // +10 min

      const result = aplicarTolerancia(horarioReal, horarioPrevisto, 5);

      expect(result.horarioEfetivo).toEqual(horarioReal);
      expect(result.dentroDaTolerancia).toBe(false);
      expect(result.minutosExcedentes).toBe(5);
    });

    it("deve tolerar exatamente 5 minutos", () => {
      const horarioPrevisto = new Date("2026-08-10T08:00:00");
      const horarioReal = new Date("2026-08-10T08:05:00");

      const result = aplicarTolerancia(horarioReal, horarioPrevisto, 5);

      expect(result.dentroDaTolerancia).toBe(true);
      expect(result.minutosExcedentes).toBe(0);
    });

    it("deve rejeitar 6 minutos (fora da tolerância)", () => {
      const horarioPrevisto = new Date("2026-08-10T08:00:00");
      const horarioReal = new Date("2026-08-10T08:06:00");

      const result = aplicarTolerancia(horarioReal, horarioPrevisto, 5);

      expect(result.dentroDaTolerancia).toBe(false);
      expect(result.minutosExcedentes).toBe(1);
    });

    it("não deve ajustar adiantamento (horarioReal < horarioPrevisto)", () => {
      const horarioPrevisto = new Date("2026-08-10T08:00:00");
      const horarioReal = new Date("2026-08-10T07:55:00"); // -5 min

      const result = aplicarTolerancia(horarioReal, horarioPrevisto, 5);

      expect(result.horarioEfetivo).toEqual(horarioReal);
      expect(result.dentroDaTolerancia).toBe(false);
      expect(result.minutosExcedentes).toBe(0);
    });

    it("deve calcular minutos excedentes corretamente para atraso grande", () => {
      const horarioPrevisto = new Date("2026-08-10T08:00:00");
      const horarioReal = new Date("2026-08-10T08:30:00"); // +30 min

      const result = aplicarTolerancia(horarioReal, horarioPrevisto, 5);

      expect(result.dentroDaTolerancia).toBe(false);
      expect(result.minutosExcedentes).toBe(25);
    });

    it("deve tolerar 0 minutos (tolerância zero)", () => {
      const horarioPrevisto = new Date("2026-08-10T08:00:00");
      const horarioReal = new Date("2026-08-10T08:00:00");

      const result = aplicarTolerancia(horarioReal, horarioPrevisto, 0);

      expect(result.dentroDaTolerancia).toBe(true);
      expect(result.minutosExcedentes).toBe(0);
    });
  });

  describe("minutosParaDate", () => {
    const referencia = new Date("2026-08-10T00:00:00");

    it("deve converter 0 para meia-noite", () => {
      const result = minutosParaDate(0, referencia);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it("deve converter 480 para 08:00", () => {
      const result = minutosParaDate(480, referencia);
      expect(result.getHours()).toBe(8);
      expect(result.getMinutes()).toBe(0);
    });

    it("deve converter 765 para 12:45", () => {
      const result = minutosParaDate(765, referencia);
      expect(result.getHours()).toBe(12);
      expect(result.getMinutes()).toBe(45);
    });

    it("deve converter 1020 para 17:00", () => {
      const result = minutosParaDate(1020, referencia);
      expect(result.getHours()).toBe(17);
      expect(result.getMinutes()).toBe(0);
    });

    it("deve manter a data de referência", () => {
      const result = minutosParaDate(480, referencia);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(7); // Agosto = 7
      expect(result.getDate()).toBe(10);
    });
  });

  describe("tipoParaHorarioPrevisto", () => {
    const schedule = {
      entryTime: 480,   // 08:00
      lunchStart: 720,  // 12:00
      lunchEnd: 780,    // 13:00
      exitTime: 1020,   // 17:00
    };

    it("deve retornar entryTime para ENTRY", () => {
      expect(tipoParaHorarioPrevisto("ENTRY", schedule)).toBe(480);
    });

    it("deve retornar lunchStart para LUNCH_START", () => {
      expect(tipoParaHorarioPrevisto("LUNCH_START", schedule)).toBe(720);
    });

    it("deve retornar lunchEnd para LUNCH_END", () => {
      expect(tipoParaHorarioPrevisto("LUNCH_END", schedule)).toBe(780);
    });

    it("deve retornar exitTime para EXIT", () => {
      expect(tipoParaHorarioPrevisto("EXIT", schedule)).toBe(1020);
    });

    it("deve retornar null para tipo desconhecido", () => {
      expect(tipoParaHorarioPrevisto("UNKNOWN", schedule)).toBeNull();
    });
  });

  describe("tipoParaTolerancia", () => {
    const schedule = {
      checkinToleranceMinutes: 5,
      lunchToleranceMinutes: 15,
    };

    it("deve retornar checkinToleranceMinutes para ENTRY", () => {
      expect(tipoParaTolerancia("ENTRY", schedule)).toBe(5);
    });

    it("deve retornar checkinToleranceMinutes para EXIT", () => {
      expect(tipoParaTolerancia("EXIT", schedule)).toBe(5);
    });

    it("deve retornar lunchToleranceMinutes para LUNCH_START", () => {
      expect(tipoParaTolerancia("LUNCH_START", schedule)).toBe(15);
    });

    it("deve retornar lunchToleranceMinutes para LUNCH_END", () => {
      expect(tipoParaTolerancia("LUNCH_END", schedule)).toBe(15);
    });

    it("deve retornar checkinToleranceMinutes para tipo desconhecido (default)", () => {
      expect(tipoParaTolerancia("UNKNOWN", schedule)).toBe(5);
    });
  });

  describe("isDiaUtil", () => {
    // Use full datetime strings to avoid UTC/local timezone mismatch
    // Seg=1, Ter=2, Qua=4, Qui=8, Sex=16, Sáb=32, Dom=64
    it("deve retornar true para segunda-feira (bitmask 1)", () => {
      const segunda = new Date("2026-08-10T12:00:00"); // Segunda-feira
      expect(isDiaUtil(127, segunda)).toBe(true); // Todos os dias
      expect(isDiaUtil(1, segunda)).toBe(true);   // Só Seg
    });

    it("deve retornar true para sexta-feira (bitmask 16)", () => {
      const sexta = new Date("2026-08-14T12:00:00"); // Sexta-feira
      expect(isDiaUtil(16, sexta)).toBe(true);
    });

    it("deve retornar false para sábado quando não incluído (bitmask 1 = seg)", () => {
      const sabado = new Date("2026-08-15T12:00:00"); // Sábado
      expect(isDiaUtil(1, sabado)).toBe(false); // Só Seg
    });

    it("deve retornar true para sábado quando incluído (bitmask 32)", () => {
      const sabado = new Date("2026-08-15T12:00:00"); // Sábado
      expect(isDiaUtil(32, sabado)).toBe(true);
    });

    it("deve retornar false para domingo quando não incluído", () => {
      const domingo = new Date("2026-08-16T12:00:00"); // Domingo
      expect(isDiaUtil(1, domingo)).toBe(false);
    });

    it("deve retornar true para domingo quando incluído (bitmask 64)", () => {
      const domingo = new Date("2026-08-16T12:00:00"); // Domingo
      expect(isDiaUtil(64, domingo)).toBe(true);
    });

    it("deve aceitar daysOfWeek = 127 (todos os dias)", () => {
      const dates = [
        new Date("2026-08-10T12:00:00"), // Seg
        new Date("2026-08-11T12:00:00"), // Ter
        new Date("2026-08-12T12:00:00"), // Qua
        new Date("2026-08-13T12:00:00"), // Qui
        new Date("2026-08-14T12:00:00"), // Sex
        new Date("2026-08-15T12:00:00"), // Sáb
        new Date("2026-08-16T12:00:00"), // Dom
      ];

      for (const date of dates) {
        expect(isDiaUtil(127, date)).toBe(true);
      }
    });

    it("deve aceitar daysOfWeek = 31 (Seg a Sex)", () => {
      // Seg=1, Ter=2, Qua=4, Qui=8, Sex=16 → 1+2+4+8+16 = 31
      expect(isDiaUtil(31, new Date("2026-08-10T12:00:00"))).toBe(true);  // Seg
      expect(isDiaUtil(31, new Date("2026-08-14T12:00:00"))).toBe(true);  // Sex
      expect(isDiaUtil(31, new Date("2026-08-15T12:00:00"))).toBe(false); // Sáb
    });
  });
});

import { describe, it, expect } from "vitest"
import {
  REPORT_ID_REGEX,
  isValidReportId,
  parseReportIdFromFilename,
  createReportId,
  getReportFilePath,
  getReportsDir,
} from "./report-storage"

describe("report-storage", () => {
  describe("REPORT_ID_REGEX / isValidReportId", () => {
    it("accepts valid ids: alphanumeric, hyphen, underscore, 1-64 chars", () => {
      expect(isValidReportId("a")).toBe(true)
      expect(isValidReportId("abc-123_xyz")).toBe(true)
      expect(isValidReportId("m1x9k2abc-def_GHI")).toBe(true)
      const long64 = "a".repeat(64)
      expect(isValidReportId(long64)).toBe(true)
    })

    it("rejects empty or invalid", () => {
      expect(isValidReportId("")).toBe(false)
      expect(isValidReportId("a".repeat(65))).toBe(false)
      expect(isValidReportId("a/b")).toBe(false)
      expect(isValidReportId("a.b")).toBe(false)
      expect(isValidReportId("a b")).toBe(false)
      expect(isValidReportId("invalid!id")).toBe(false)
    })
  })

  describe("parseReportIdFromFilename", () => {
    it("extracts id from report_<id>.md", () => {
      expect(parseReportIdFromFilename("report_abc123.md")).toBe("abc123")
      expect(parseReportIdFromFilename("report_m1x9k2-abc_def.md")).toBe("m1x9k2-abc_def")
    })

    it("returns null for non-matching names", () => {
      expect(parseReportIdFromFilename("report_abc123")).toBe(null)
      expect(parseReportIdFromFilename("report_abc123.txt")).toBe(null)
      expect(parseReportIdFromFilename("other_abc123.md")).toBe(null)
      expect(parseReportIdFromFilename("report_.md")).toBe(null)
    })
  })

  describe("createReportId", () => {
    it("returns string matching REPORT_ID_REGEX", () => {
      const id = createReportId()
      expect(id).toMatch(REPORT_ID_REGEX)
      expect(id.length).toBeLessThanOrEqual(64)
    })

    it("includes time and random hex segment", () => {
      const id = createReportId()
      const parts = id.split("-")
      expect(parts.length).toBe(2)
      expect(parts[1].length).toBe(8)
      expect(parts[1]).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe("getReportFilePath", () => {
    it("joins reports dir with report_<id>.md", () => {
      const dir = getReportsDir()
      expect(getReportFilePath("test-id")).toBe(`${dir}/report_test-id.md`)
    })
  })
})

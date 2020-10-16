import { API, GET, ContentType } from '../../../api'
import { tsvParse, autoType, DSVRowString } from 'd3-dsv'
import { mapKeys, snakeCase, deburr } from 'lodash'

/**
 * Download finance reports filtered by your specified criteria.
 * @param query
 */
export async function downloadFinancialReports(
    api: API,
    query: GetFinanceReportsQuery
): Promise<RowArray> {
    const body = await GET<string>(api, 'financeReports', {
        query,
        accept: ContentType.GZIP,
    })

    return parseTsv(body, query)
}

function mapKey(_: any, key: string) {
    return snakeCase(deburr(key))
}

interface RowArray<Columns extends string = string>
    extends Array<DSVRowString<Columns>> {
    /**
     * List of column names.
     */
    columns: Columns[]
    originalColumns: Columns[]
}

/**
 * Download sales and trends reports filtered by your specified criteria.
 * @param query
 */
export async function downloadSalesReports(
    api: API,
    query: GetSalesReportsQuery
): Promise<RowArray> {
    const body = await GET<string>(api, 'salesReports', {
        query,
        accept: ContentType.GZIP,
    })

    return parseTsv(body, query)
}

function removeRows(stringBody: string, n: number) {
    for (let i = 0; i < n; i++) {
        stringBody = stringBody.slice(stringBody.indexOf('\n') + 1)
    }

    return stringBody
}

function parseTsv(
    stringBody: string,
    query: GetFinanceReportsQuery | GetSalesReportsQuery
) {
    if (query.filter && query.filter.reportType === 'FINANCE_DETAIL') {
        stringBody = removeRows(stringBody, 3)
    }
    const parsed = tsvParse(stringBody, autoType)
    const mapped: any = parsed.map((row: any) => mapKeys(row, mapKey))
    mapped.originalColumns = parsed.columns
    mapped.columns = parsed.columns.map(key => mapKey(null, key))
    return mapped
}

import { DateTime } from 'luxon'

interface GetFinanceReportsQuery {
    filter?: {
        /**
         * You can download consolidated or separate financial reports per
         * territory. For a complete list of possible values, see
         * {@link https://help.apple.com/app-store-connect/?lang=en#/dev63d64d955|Financial Report Regions and Currencies}.
         */
        regionCode: string
        /**
         * The date of the report you wish to download based on the
         * Apple Fiscal Calendar. The date is specified in the YYYY-MM format.
         */
        reportDate: DateTime
        /**
         * This value is always 'FINANCIAL'.
         */
        reportType: FinanceReportType
        /**
         * You can find your vendor number in {@link https://help.apple.com/app-store-connect/#/dev3a16f3fe0|Payments and Financial Reports}.
         */
        vendorNumber: string
    }
}

interface GetSalesReportsQuery {
    filter: {
        /**
         * Frequency of the report to download.
         */
        frequency: Frequency
        /**
         * The report date to download. The date is specified in the YYYY-MM-DD
         * format for all report frequencies except DAILY, which does not require
         * a specified date.
         *
         * @see {@link https://help.apple.com/itc/appssalesandtrends/#/itc48f999955}
         */
        reportDate?: DateTime
        /**
         * The report sub type to download.
         */
        reportSubType: SalesReportSubType
        /**
         * The report to download.
         */
        reportType: SalesReportType
        /**
         * You can find your vendor number in {@link https://help.apple.com/app-store-connect/#/dev3a16f3fe0|Payments and Financial Reports}.
         */
        vendorNumber: string
        /**
         * The version of the report.
         */
        version: string
    }
}

export type FinanceReportType = 'FINANCIAL' | 'FINANCE_DETAIL'
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export type SalesReportSubType = 'SUMMARY' | 'DETAILED' | 'OPT_IN'
export type SalesReportType =
    | 'SALES'
    | 'PRE_ORDER'
    | 'NEWSSTAND'
    | 'SUBSCRIPTION'
    | 'SUBSCRIPTION_EVENT'
    | 'SUBSCRIBER'

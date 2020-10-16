require('dotenv').config()

const { readFileSync } = require('fs')
const path = require('path')
const { env } = require('process')
const { v1 } = require('../lib')

function getApi() {
    let privateKey
    if (env.ASC_PRIVATE_KEY) {
        privateKey = env.ASC_PRIVATE_KEY
    } else if (env.ASC_PRIVATE_KEY_PATH) {
        privateKey = readFileSync(path.normalize(env.ASC_PRIVATE_KEY_PATH))
    } else {
        privateKey = ''
    }
    const kid = env.ASC_KEY_ID || ''
    const issuerId = env.ASC_ISSUER_ID || ''

    const token = v1.token(privateKey, issuerId, kid)
    return v1(token)
}

async function run() {
    const api = getApi()
    const vendorNumber = env.ASC_VENDORID

    const financeDetail = await v1.financeReports.downloadFinancialReports(
        api,
        {
            filter: {
                vendorNumber,
                reportType: 'FINANCE_DETAIL',
                regionCode: 'Z1',
                reportDate: '2020-09',
            },
        }
    )

    console.log(financeDetail)

    const finance = await v1.financeReports.downloadFinancialReports(api, {
        filter: {
            vendorNumber,
            reportType: 'FINANCIAL',
            regionCode: 'ZZ',
            reportDate: '2020-09',
        },
    })

    console.log(finance)

    const salesSummary = await v1.financeReports.downloadSalesReports(api, {
        filter: {
            vendorNumber,
            reportType: 'SALES',
            reportSubType: 'SUMMARY',
            version: '1_0',
            frequency: 'DAILY',
            reportDate: '2020-10-04',
        },
    })

    console.log(salesSummary)

    const subscription = await v1.financeReports.downloadSalesReports(api, {
        filter: {
            vendorNumber,
            reportType: 'SUBSCRIPTION',
            reportSubType: 'SUMMARY',
            version: '1_2',
            frequency: 'DAILY',
            reportDate: '2020-09-01',
        },
    })

    console.log(subscription)

    const subEvent = await v1.financeReports.downloadSalesReports(api, {
        filter: {
            vendorNumber,
            reportType: 'SUBSCRIPTION_EVENT',
            reportSubType: 'SUMMARY',
            version: '1_2',
            frequency: 'DAILY',
            reportDate: '2020-09-01',
        },
    })

    console.log(subEvent)

    const subscriber = await v1.financeReports.downloadSalesReports(api, {
        filter: {
            vendorNumber,
            reportType: 'SUBSCRIBER',
            reportSubType: 'DETAILED',
            version: '1_2',
            frequency: 'DAILY',
            reportDate: '2020-09-01',
        },
    })

    console.log(subscriber)
}

run().then(console.log, console.log)

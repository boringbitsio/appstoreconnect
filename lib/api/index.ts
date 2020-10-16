import got, { HTTPAlias, Headers } from 'got'
import { DateTime } from 'luxon'
import qs from 'qs'
import { URL } from 'url'
import { ErrorResponse } from '../v1/error'
import * as zlib from 'zlib'

export interface API {
    baseUrl: string
    token: string | null
}

export function makeAPI(baseUrl: string, token?: string): API {
    return { baseUrl, token: token || null }
}

export class APIError extends Error {
    readonly response: ErrorResponse

    constructor(response: ErrorResponse, code?: number, message?: string) {
        super(`${code} ${message}`)
        this.response = response
    }
}

export enum ContentType {
    JSON = 'application/json',
    GZIP = 'application/a-gzip',
}

interface APIOptions {
    query?: object
    body?: object
    accept?: ContentType
}

export function HEAD<T>(
    api: API,
    path: string,
    options: APIOptions = {}
): Promise<T> {
    return call(api, path, 'head', options)
}
export function GET<T>(
    api: API,
    path: string,
    options: APIOptions = {}
): Promise<T> {
    return call(api, path, 'get', options)
}
export function POST<T>(
    api: API,
    path: string,
    options: APIOptions = {}
): Promise<T> {
    return call(api, path, 'post', options)
}
export function PUT<T>(
    api: API,
    path: string,
    options: APIOptions = {}
): Promise<T> {
    return call(api, path, 'put', options)
}
export function PATCH<T>(
    api: API,
    path: string,
    options: APIOptions = {}
): Promise<T> {
    return call(api, path, 'patch', options)
}
export function DELETE<T>(
    api: API,
    path: string,
    options: APIOptions = {}
): Promise<T> {
    return call(api, path, 'delete', options)
}

async function call<T>(
    api: API,
    path: string,
    method: HTTPAlias,
    options: APIOptions = {}
): Promise<T> {
    let rawResponse
    try {
        rawResponse = await got(path, {
            prefixUrl: api.baseUrl,
            method,
            headers: headers(api.token, options.accept),
            searchParams: query(options.query),
            body: body(options.body),
            responseType:
                options.accept === ContentType.GZIP ? 'buffer' : undefined,
        })
    } catch (error) {
        throw new Error(error.response.body)
    }

    const { body: responseBody, ...response } = rawResponse

    if (!responseBody) {
        return (undefined as unknown) as T
    } else if (options.accept === ContentType.GZIP) {
        return (gunzip(responseBody as any, 'utf8') as unknown) as T
    } else {
        return json(responseBody, response)
    }
}

function headers(
    token: string | null,
    accept: ContentType = ContentType.JSON
): Headers {
    const defaultHeaders: Headers = {
        Accept: accept,
    }
    let headers = defaultHeaders
    if (token) {
        headers = {
            ...headers,
            authorization: `Bearer ${token}`,
        }
    }
    return headers
}

function json(
    body: any,
    response: { statusCode?: number; statusMessage?: string }
) {
    let json
    try {
        json = JSON.parse(body, jsonParser)
    } catch (jsonError) {
        throw jsonError
    }

    if (json.errors && Array.isArray(json.errors)) {
        throw new APIError(json, response.statusCode, response.statusMessage)
    }

    return json
}

function jsonParser(_key: any, value: any) {
    if (typeof value === 'string') {
        const url = urlStringToURL(value)
        if (url) {
            return url
        }

        const date = dateStringToDate(value)
        if (date) {
            return date
        }
    }
    return value
}

function urlStringToURL(value: string): URL | undefined {
    try {
        const url = new URL(value)
        if (url) {
            return url
        }
    } catch {}
}

function dateStringToDate(value: string): DateTime | undefined {
    const date = DateTime.fromISO(value)
    if (date.isValid) {
        return date
    }
}

const isObject = (value: any) => typeof value === 'object' && value !== null
const isDateTime = (value: any) => (value && value.isLuxonDateTime) || false
const isURL = (value: any) =>
    (value && value.href && typeof value.href === 'string') || false

function query(object: object | undefined): string | undefined {
    if (object === undefined) {
        return
    }
    return qs.stringify(sanitize(object), {
        arrayFormat: 'repeat',
        encodeValuesOnly: true,
    })
}

function sanitize(object: object): object {
    if (isObject(object)) {
        if (Array.isArray(object)) {
            object = object.map(sanitize)
        } else if (isDateTime(object)) {
            object = (object as any).toISO()
        } else if (isURL(object)) {
            object = (object as any).href
        } else {
            object = Object.entries(object).reduce(
                (acc, [key, value]) => ({ ...acc, [key]: sanitize(value) }),
                {}
            )
        }
    }
    return object
}

function body(object: object | undefined): string | undefined {
    if (object === undefined) {
        return
    }
    const json = JSON.stringify(object)
    return json
}

export function gunzip(input: zlib.InputType): Promise<Buffer>
export function gunzip(input: zlib.InputType, encoding: string): Promise<string>
export function gunzip(
    input: zlib.InputType,
    encoding?: string
): Promise<Buffer | string> {
    return new Promise<Buffer | string>((resolve, reject) => {
        try {
            zlib.gunzip(input, (err, unzipped) => {
                try {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(
                            isNil(encoding)
                                ? unzipped
                                : unzipped.toString(encoding)
                        )
                    }
                } catch (e) {
                    reject(e)
                }
            })
        } catch (e) {
            reject(e)
        }
    })
}

export function isNil(val: unknown): boolean {
    return null === val || 'undefined' === typeof val
}

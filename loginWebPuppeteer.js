import puppeteer from 'puppeteer'
import dotenv from 'dotenv'
dotenv.config()

// Pequeno delay após clicar
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let cookieHandled = false
async function handleCookieConsent(page, n) {
    const cookieButtonSelector = '#onetrust-accept-btn-handler'
    try {
        if (cookieHandled) return

        // Espera pelo botão de cookies com um timeout curto, pois pode não estar sempre presente
        await page.waitForSelector(cookieButtonSelector, { timeout: 10000, visible: true })
        await page.click(cookieButtonSelector)
        cookieHandled = true
        await sleep(1000)
    } catch (error) {
        console.log(`Banner de cookies NÃO detectado na ${n}ª tentativa!`)
    }
}

async function handleTourModal(page) {
    const modalButtonLaterSelector = 'button[aria-label="Close modal"]'

    try {
        await page.waitForSelector(modalButtonLaterSelector, { timeout: 15000, visible: true })
        // // Clica no botão do modal e espera possível navegação (se houver), sem travar se não acontecer.
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => { }),
            page.click(modalButtonLaterSelector),
        ])



    } catch (error) {
        await sleep(1000)
    }
}

const handledLines = []
async function downloadInvoice() { }

async function validateCurrentLine(page) {

    await page.waitForSelector('.mdn-Menu-top-event')

    const mobileLineInfo = await page.$eval('.mdn-Menu-top-event', element => {
        const plan = element.querySelector('strong')?.textContent.trim() || '';
        const phone = element.querySelector('span[aria-label]')?.textContent.trim() || '';
        return { plan, phone };
    });

    try {
        if (mobileLineInfo.plan === "Pré-pago") return
        const pdfInvoice = 'a.mdn-Shortcut[href*="faturadigital/visualizar"]'
        const seeInvoice = 'button[data-tag="clique:ver-faturas"]'

        await page.waitForSelector(seeInvoice, { timeout: 30000, visible: true })
        await page.click(seeInvoice)
        await sleep(1000)

        await page.waitForSelector(pdfInvoice, { timeout: 30000, visible: true })
        await page.click(pdfInvoice)

        handledLines.push(mobileLineInfo)
        console.log("Salvou! " + handledLines)
    } catch {
        console.log("errou"+handledLines)
    }
}

async function loginClaroWebWithPuppeteer(cpf, password) {
    const browser = await puppeteer.launch({ headless: false })

    const page = await browser.newPage()

    await page.setViewport({ width: 1080, height: 1024 })

    try {
        const authUrl = 'https://auth.claro.com.br/authorize?client_id=MinhaClaroDIG&response_type=code&scope=openid+net_site+net_profile&nonce=abc123&authMs=UP,EP,DOCP,OTP&&redirect_uri=https://www.claro.com.br/credencial/callback-mcm'
        await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 90000 })

        await handleCookieConsent(page, 1)

        const cpfEmailInputSelector = 'input[name="Login"]'
        await page.waitForSelector(cpfEmailInputSelector, { timeout: 30000, visible: true })

        await sleep(1000)

        await page.type(cpfEmailInputSelector, cpf, { delay: 200 })

        const continueButtonSelector = 'button[data-testid="continuar"]'
        await page.waitForSelector(continueButtonSelector, { timeout: 30000, visible: true })

        await Promise.all([
            page.waitForSelector('input[name="pf.pass"]', { timeout: 30000, visible: true }),
            page.click(continueButtonSelector),
        ])

        await sleep(2000)

        const passwordInputSelector = 'input[name="pf.pass"]'
        await sleep(1000)
        await page.type(passwordInputSelector, password, { delay: 200 })

        const accessButtonSelector = 'button[data-testid="acessar"]'
        await page.waitForSelector(accessButtonSelector, { timeout: 30000, visible: true })
        await sleep(500)
        await page.waitForFunction(selector => !document.querySelector(selector)?.disabled, {}, accessButtonSelector)

        await Promise.all([
            // Pausa o script até que a página navegue para uma nova URL
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }),
            page.click(accessButtonSelector),
        ])

        await handleTourModal(page)
        await handleCookieConsent(page, 2)
        await handleTourModal(page)
        await sleep(1000)

        const currentUrl = page.url()

        

        return { result: { success: true, message: 'Login e fechamento de modal bem-sucedidos!', url: currentUrl }, browser, page }

    } catch (error) {
        console.error('Erro durante a automação de login:')
        console.error(`Erro: ${error.message}`)

        if (page && !page.isClosed()) {
            try {
                await page.screenshot({ path: 'debug_error_final_state.png', fullPage: true })
            } catch (e) {
                console.error('   Erro ao salvar screenshot de depuração final:', e.message)
            }
        }

        return { result: { success: false, error: error.message }, browser, page }
    }
}

// Quando for para habilitar a função de multi contas, lembrar de usar o context ou o puppeteer.launch()

// usei "(" para forçar o parser a tratar isso como uma expressão de função e não como uma declaração inválida.
(async () => {
    const cpf = process.env.CLARO_CPF
    const password = process.env.CLARO_PASSWORD

    if (!cpf || !password) {
        console.error('ERRO: CPF ou Senha não definidos nas variáveis de ambiente (.env).')
        process.exit(1)
    }

    const { result, browser, page } = await loginClaroWebWithPuppeteer(cpf, password)
    
    if (result.success) {
        await validateCurrentLine(page)
        console.log('Autenticação Concluída!')
    } else {
        console.error('Falha na Autenticação!')
    }
    await browser.close()
})() // () executa imediatamente a função após executar o codigo.
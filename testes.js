import puppeteer from 'puppeteer';

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extrairTextosGoogle() {
  let browser;

  try {
    // Lança o navegador
    browser = await puppeteer.launch({
      headless: false, // Mude para true se não quiser ver o navegador
      defaultViewport: null,
      args: ['--start-maximized']
    });

    const page = await browser.newPage();

    // Navega para o Google
    console.log('Navegando para o Google...');
    await page.goto('https://www.google.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Aguarda um pouco para a página carregar completamente
    await sleep(2000);

    // class="gb_M gb_0 gb_Pf gb_Wf"

    const db = []
    await page.waitForSelector('div[class="gb_M gb_0 gb_Pf gb_Wf"]')

    const pai = await page.$eval('div[class="gb_M gb_0 gb_Pf gb_Wf"]', element => {
      const gmail = element.querySelector('[aria-label="Gmail "]').textContent.trim();
      const imagem = element.querySelector('[aria-label="Pesquisar imagens "]').textContent.trim();
      return { gmail, imagem };
    });

    db.push(pai)
    db.push(pai)
    db.push(pai)

    console.log("Esse daqui é: " + pai.gmail + " " + pai.imagem)
    console.log(db)

    // Tenta extrair o texto "Gmail"
    let gmailTexto = null;
    try {
      await page.waitForSelector('[aria-label="Gmail "]', { timeout: 5000 });
      gmailTexto = await page.$eval('[aria-label="Gmail "]', el => el.textContent.trim());
      console.log('Texto Gmail encontrado:', gmailTexto);
    } catch (error) {
      console.log('Não foi possível encontrar o link do Gmail');
    }

    // Tenta extrair o texto "Imagens"
    let imagensTexto = null;
    try {
      await page.waitForSelector('[aria-label="Pesquisar imagens "]', { timeout: 5000 });
      imagensTexto = await page.$eval('[aria-label="Pesquisar imagens "]', el => el.textContent.trim());
      console.log('Texto Imagens encontrado:', imagensTexto);
    } catch (error) {
      console.log('Não foi possível encontrar o link de Imagens');
    }

    // Resultado final
    console.log('\n=== RESULTADO FINAL ===');
    console.log('Gmail:', gmailTexto || 'Não encontrado');
    console.log('Imagens:', imagensTexto || 'Não encontrado');

    // Aguarda um pouco antes de fechar
    await sleep(3000);

    return {
      gmail: gmailTexto,
      imagens: imagensTexto
    };

  } catch (error) {
    console.error('Erro durante a execução:', error);
  } finally {
    if (browser) {
      await sleep(3000)
      await browser.close();
    }
  }
}

// Executa a função
extrairTextosGoogle()
  .then(resultado => {
    console.log('\nExecução finalizada!');
    if (resultado) {
      console.log('Dados extraídos:', resultado);
    }
  })
  .catch(error => {
    console.error('Erro na execução:', error);
  });
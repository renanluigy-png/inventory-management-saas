import crypto from 'crypto';
import {
  IFiscalProvider,
  TipoDocumento,
  EmissaoFiscalRequest,
  EmissaoFiscalResponse,
  CancelamentoFiscalResponse,
} from '../IFiscalProvider';

export class MockFiscalProvider implements IFiscalProvider {
  readonly name = 'mock';
  readonly tiposSuportados: TipoDocumento[] = ['NFCE', 'NFE', 'SAT', 'CUPOM'];

  async emitir(request: EmissaoFiscalRequest): Promise<EmissaoFiscalResponse> {
    const numero = request.numero ?? String(Math.floor(Math.random() * 999999 + 1)).padStart(9, '0');
    const serie = request.serie ?? '001';
    const chaveAcesso = this.gerarChaveAcesso(request.emitente.cnpj, numero, serie);

    // Gera XML mínimo de NF-e/NFC-e para fins de mock
    const xml = this.gerarXmlMock({ ...request, numero, serie, chaveAcesso });

    return {
      chaveAcesso,
      numero,
      serie,
      xml,
      qrCode: `https://www.nfe.fazenda.gov.br/portal/qrCode/${chaveAcesso}`,
      dataAutorizacao: new Date(),
      status: 'emitido',
      mensagem: '[MOCK] Documento fiscal emitido com sucesso (ambiente de desenvolvimento)',
    };
  }

  async cancelar(chaveAcesso: string, _motivo: string): Promise<CancelamentoFiscalResponse> {
    return {
      chaveAcesso,
      protocolo: `MOCK${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      dataAutorizacao: new Date(),
      status: 'cancelado',
      mensagem: '[MOCK] Documento cancelado com sucesso',
    };
  }

  async consultar(chaveAcesso: string): Promise<EmissaoFiscalResponse> {
    return {
      chaveAcesso,
      numero: '000000001',
      serie: '001',
      dataAutorizacao: new Date(),
      status: 'emitido',
      mensagem: '[MOCK] Consulta simulada — documento autorizado',
    };
  }

  private gerarChaveAcesso(cnpj: string, numero: string, serie: string): string {
    const uf = '35'; // SP
    const aamm = new Date().toISOString().slice(2, 7).replace('-', '');
    const cnpjClean = cnpj.replace(/\D/g, '').padEnd(14, '0').slice(0, 14);
    const modelo = '65'; // NFC-e
    const cNF = crypto.randomBytes(4).readUInt32BE(0).toString().padEnd(8, '0').slice(0, 8);
    const base = `${uf}${aamm}${cnpjClean}${modelo}${serie.padStart(3, '0')}${numero.padStart(9, '0')}1${cNF}`;
    const digito = this.calcularDigitoVerificador(base);
    return `${base}${digito}`;
  }

  private calcularDigitoVerificador(chave: string): string {
    const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
    let soma = 0;
    for (let i = chave.length - 1, p = 0; i >= 0; i--, p = (p + 1) % 8) {
      soma += parseInt(chave[i], 10) * pesos[p];
    }
    const resto = soma % 11;
    return String(resto < 2 ? 0 : 11 - resto);
  }

  private gerarXmlMock(data: EmissaoFiscalRequest & { numero: string; serie: string; chaveAcesso: string }): string {
    const agora = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- [MOCK] NFC-e gerada em ambiente de desenvolvimento - NÃO TEM VALOR FISCAL -->
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe versao="4.00" Id="NFe${data.chaveAcesso}">
      <ide>
        <cUF>35</cUF>
        <natOp>VENDA</natOp>
        <mod>65</mod>
        <serie>${data.serie}</serie>
        <nNF>${data.numero}</nNF>
        <dhEmi>${agora}</dhEmi>
        <tpNF>1</tpNF>
        <tpAmb>2</tpAmb><!-- 2=Homologação/Mock -->
      </ide>
      <emit>
        <CNPJ>${data.emitente.cnpj.replace(/\D/g, '')}</CNPJ>
        <xNome>${data.emitente.nomeEmpresa}</xNome>
      </emit>
      <total>
        <ICMSTot>
          <vNF>${data.totalLiquido.toFixed(2)}</vNF>
        </ICMSTot>
      </total>
      <infAdic>
        <infCpl>AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <chNFe>${data.chaveAcesso}</chNFe>
      <dhRecbto>${agora}</dhRecbto>
      <nProt>MOCK${Date.now()}</nProt>
      <xMotivo>AUTORIZADO O USO DA NF-E [MOCK]</xMotivo>
      <cStat>100</cStat>
    </infProt>
  </protNFe>
</nfeProc>`;
  }
}

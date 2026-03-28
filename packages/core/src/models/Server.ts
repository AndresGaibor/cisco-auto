import { BaseDevice } from './BaseDevice.ts';

export class Server extends BaseDevice {
  
  private getEthernetPort(): any {
    return this.findNetworkPort(this.engineNode.MODULE, (p: any) => 
      p.TYPE && (String(p.TYPE).includes('Ethernet') || String(p.TYPE).includes('FE'))
    );
  }

  /**
   * Gestiona el sistema de archivos del servidor (ej. index.html)
   */
  public writeFile(filename: string, content: string): void {
    if (!this.engineNode.FILE_SYSTEM) {
      this.engineNode.FILE_SYSTEM = { FILE: [] };
    }
    
    let files = this.engineNode.FILE_SYSTEM.FILE;
    if (!Array.isArray(files)) {
      files = files ? [files] : [];
      this.engineNode.FILE_SYSTEM.FILE = files;
    }

    const existingFile = files.find((f: any) => f.NAME === filename);
    if (existingFile) {
      existingFile.CONTENT = content;
    } else {
      files.push({ NAME: filename, CONTENT: content });
    }
    console.log(`   [Server ${this.getName()}] Archivo escrito: ${filename}`);
  }
/**
 * Configura registros DNS (A, CNAME, etc)
 */
public addDnsRecord(name: string, ip: string, type: 'A' | 'CNAME' = 'A'): void {
  if (!this.engineNode.DNS_SERVER) {
    this.engineNode.DNS_SERVER = { ENABLED: '1', 'NAMESERVER-DATABASE': { 'RESOURCE-RECORD': [] } };
  }

  let db = this.engineNode.DNS_SERVER['NAMESERVER-DATABASE'];
  if (!db) {
      db = { 'RESOURCE-RECORD': [] };
      this.engineNode.DNS_SERVER['NAMESERVER-DATABASE'] = db;
  }

  let records = db['RESOURCE-RECORD'];
  if (!Array.isArray(records)) {
    records = records ? [records] : [];
    db['RESOURCE-RECORD'] = records;
  }

  records.push({
    TYPE: type === 'A' ? 'A-REC' : 'CNAME-REC',
    NAME: name,
    TTL: '86400',
    IPADDRESS: ip
  });

  console.log(`   [Server ${this.getName()}] DNS Record añadido: ${name} -> ${ip} (${type})`);
}

public setHttpService(enabled: boolean): void {
  if (!this.engineNode.HTTP_SERVER) this.engineNode.HTTP_SERVER = {};
  this.engineNode.HTTP_SERVER.ENABLED = enabled ? '1' : '0';
}

/**
 * Configura el servicio FTP
 */
public setFtpService(enabled: boolean): void {
  if (!this.engineNode.FTP_SERVER) this.engineNode.FTP_SERVER = { ENABLED: enabled ? '1' : '0' };
  else this.engineNode.FTP_SERVER.ENABLED = enabled ? '1' : '0';
}

/**
 * Añade una cuenta FTP al servidor
 */
public addFtpAccount(username: string, password: string, permissions: string = 'RWDNL'): void {
  this.setFtpService(true);
  if (!this.engineNode.FTP_SERVER.USER_ACCOUNT_MNGR) {
    this.engineNode.FTP_SERVER.USER_ACCOUNT_MNGR = { ACCOUNT: [] };
  }
  let accounts = this.engineNode.FTP_SERVER.USER_ACCOUNT_MNGR.ACCOUNT;
  if (!Array.isArray(accounts)) {
    accounts = accounts ? [accounts] : [];
    this.engineNode.FTP_SERVER.USER_ACCOUNT_MNGR.ACCOUNT = accounts;
  }
  accounts.push({ USERNAME: username, PASSWORD: password, PERMISSIONS: permissions });
  console.log(`   [Server ${this.getName()}] Cuenta FTP añadida: ${username}`);
}

/**
 * Configura el servicio de Email (SMTP y POP3)
 */
 public setEmailService(domain: string, smtp: boolean = true, pop3: boolean = true): void {
 if (!this.engineNode.EMAIL_SERVER) {
   this.engineNode.EMAIL_SERVER = { NO_OF_USERS: '0' };
 }
 this.engineNode.EMAIL_SERVER.SMTP_ENABLED = smtp ? '1' : '0';
 this.engineNode.EMAIL_SERVER.POP3_ENABLED = pop3 ? '1' : '0';
 this.engineNode.EMAIL_SERVER.SMTP_DOMAIN = domain;
 console.log(`   [Server ${this.getName()}] Servidor Email configurado en dominio: ${domain}`);
 }

 /**
  * Añade una cuenta de Email al servidor
  */
 public addEmailAccount(username: string, password: string): void {
   if (!this.engineNode.EMAIL_SERVER) {
     this.setEmailService(''); // Inicializa con dominio vacío si no existe
   }

   // Packet Tracer guarda los usuarios de correo en IOE_USER_MANAGER o similar,
   // pero vamos a añadir el objeto simple como se suele encontrar.
   if (!this.engineNode.IOE_USER_MANAGER) {
     this.engineNode.IOE_USER_MANAGER = { USERS: { USER: [] } };
   } else if (!this.engineNode.IOE_USER_MANAGER.USERS) {
     this.engineNode.IOE_USER_MANAGER.USERS = { USER: [] };
   }

   let users = this.engineNode.IOE_USER_MANAGER.USERS.USER;
   if (!Array.isArray(users)) {
     users = users ? [users] : [];
     this.engineNode.IOE_USER_MANAGER.USERS.USER = users;
   }

   users.push({
     USERNAME: username,
     PASSWORD: password,
     EMAIL_USER: 'true' // Marca al usuario como usuario de correo
   });

   // Actualizar contador
   this.engineNode.EMAIL_SERVER.NO_OF_USERS = String(users.length);
   console.log(`   [Server ${this.getName()}] Cuenta de Email añadida: ${username}`);
 }
 }

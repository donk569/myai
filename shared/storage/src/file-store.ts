import * as fs from 'node:fs';
import * as path from 'node:path';

export class FileStore {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  save(relativePath: string, data: Buffer): void {
    const fullPath = this.getPath(relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, data);
  }

  load(relativePath: string): Buffer | null {
    const fullPath = this.getPath(relativePath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath);
  }

  delete(relativePath: string): boolean {
    const fullPath = this.getPath(relativePath);
    if (!fs.existsSync(fullPath)) return false;
    fs.unlinkSync(fullPath);
    return true;
  }

  list(dirPath: string = ''): string[] {
    const fullPath = path.join(this.baseDir, dirPath);
    if (!fs.existsSync(fullPath)) return [];
    return fs.readdirSync(fullPath, { recursive: true })
      .map(f => f.toString());
  }

  getPath(relativePath: string): string {
    return path.join(this.baseDir, relativePath);
  }
}

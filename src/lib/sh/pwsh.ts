import { type Sh, ShBase } from "../sh";

export class Powershell extends ShBase implements Sh {
	constructor() {
		super("pwsh", "ps1");
	}

	toRawStr(value: string): string {
		return `'${value.replaceAll("'", "''")}'`;
	}

	withTrace(): Sh {
		return this.with(async () => ["Set-PSDebug -Trace 1"]);
	}

	withVarArrSet(
		name: () => Promise<string>,
		values: () => Promise<Array<string>>,
	): Sh {
		return this.with(async () => [
			`$${await name()} = ${`@( ${(await values()).map((v) => this.toRawStr(v)).join(", ")} )`}`,
		]);
	}

	withVarSet(name: () => Promise<string>, value: () => Promise<string>): Sh {
		return this.with(async () => [
			`$${await name()} = ${this.toRawStr(await value())}`,
		]);
	}

	withVarUnset(name: () => Promise<string>): Sh {
		return this.with(async () => [
			`Remove-Variable ${await name()} -ErrorAction SilentlyContinue`,
		]);
	}
}

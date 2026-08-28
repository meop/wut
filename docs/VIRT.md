# Virt: instances, layers, and variants

How `virt` finds an instance and what each manager does with it. The shape it shares with every other command — server
resolves, client filters, one prompt — is in [OPS.md](OPS.md).

## Managers

`docker`, `lxc`, `podman`, `qemu`, on linux only; darwin and windows support none. Each has a `src/sh/nu/virt/<m>.nu`
with the same op arms, and `virtCallManager` dispatches to one.

`run` is qemu's alone. The others manage a service or a compose file and have no foreground mode, so naming one is
refused rather than planned — `RUN_MANAGERS` in `virt.ts` says so, and without it `wut v run app` would resolve a podman
path, prompt twice, and do nothing.

## Instance layout

An instance is named by its path under the host: `cfg/virt/<sys_host>/<manager>/<instance>.yaml`. The manager is part of
that path everywhere — `find`, `add`, `list`, `rem` all filter on it — and `sys_host` is why one config repo serves
every machine without a gate.

`podman` takes one more level. `<pod>.yaml` is the pod itself — `metadata.name`, the `io.podman.kube.network` and mac
annotations, `spec.hostname`, and nothing else — while `<pod>/<instance>.yaml` files each contribute containers and
volumes that are merged onto it (`podman.nu`, layers 2 and 3). A pod yaml carrying containers of its own would still
work, but it hides the pod's identity in with one instance's payload, so keep it a shell. This is also why a pod alone
is not actionable: `add` and `rem` skip a podman path with no instance part.

`qemu` takes a deeper level with the opposite meaning. `<instance>/<variant>.yaml` is another _way to configure_ an
instance, not another instance — `glass/vga.yaml` and `glass/vfio.yaml` are the emulated-gpu and passthrough spellings
of `glass`. `virtDeepMerge` appends lists, so a variant adds to its base's `qemu.arguments` rather than replacing them:
whatever a variant may set, the base must leave out. `-display` belongs in the variants for that reason.

`run` and `add` both reach a variant, but only when a filter names it — `wut v run glass vfio`, `wut v add glass vfio`.
`wut v add glass` is glass itself and never fans out over its variants, and `add` resolves the variant back to the base
for the service name, so the unit stays `qemu-glass.service` either way. `rem`, `sync` and `tidy` act on that installed
unit and so stop at the instance, and `find` lists the instance once however many variants it has.

`docker` instances are plain compose files, served whole to `docker compose --file -`. `docker.nu` reads
`services.*.volumes` to pre-create bind sources, in both the `source: … target: …` and `host:container` spellings, so
those paths are written out in full — nothing substitutes `{host}` in a compose file.

## Podman image builds

A pod yaml may open with a `kind: Build` doc naming images to build before the pod starts:

```yaml
---
kind: Build
images:
  - name: localhost/app:latest
    filePath: '/virt/{host}/podman/{pod}/Dockerfile.app'
    buildContextPath: '/srv/virt/podman/{host}/{pod}'
---
kind: Pod
metadata:
  name: '{pod}'
```

`filePath` is a `/cfg` route path, not a local one: the client fetches the Containerfile over HTTP, writes it into
`buildContextPath`, and builds. An instance then names the built image like any other — `image: localhost/app:latest`.

`Build` is wut's own kind and is stripped before anything reaches podman (`processYaml`). `{host}`, `{pod}` and
`{instance}` are substituted in both docs. An image already built in this run is not built again, so several instances
may share one.

## Qemu: add installs, run does not

`add` writes a systemd unit and the scripts it references into `/var/lib/qemu/<instance>` — `qemu.sh`, the QMP shutdown
script, and the vfio-rebind and cpu-pin scripts where the config asks for them. It appends `-pidfile` and `-daemonize`
itself, so a config must not state either.

`run` is the foreground spelling: no unit, no vfio unbind/rebind, no cpu pin. It works in a `run/` subdir of the tmp dir
and removes only that — never `/var/lib/qemu/<instance>`, which belongs to `add` and whose contents the installed unit
still points at. It also strips `-pidfile` and `-daemonize` from the merged args wherever they came from, or the
"foreground" run would detach and its own teardown would kill the VM it just started.

The generated `ExecStop` sends `system_powerdown` over QMP with `socat`, then waits for the pid to go. It exits
immediately if there is no QMP socket or no `socat`, rather than sitting out the whole timeout on a shutdown that was
never sent — so the qemu package must include `socat`.

## Find

`find` emits `VIRT_FIND` as `manager -> ['pod=instances', ...]` and `virtFindRun` filters it by `virtManagerHere`,
reports `manager not installed: ...` when none survive, then shows the numbered manager/count table, takes a selection,
and prints what was picked. It is the one op that loads `virt.nu` without loading any per-manager file, since it never
calls one.

Non-podman entries carry an empty pod (`=alma,kali,void`) and print one level in; podman entries carry the pod and print
two. A variant is not another instance, so an instance with three of them still lists once.

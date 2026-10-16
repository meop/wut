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

`run` and `add` both reach a variant, but only when a term names it — `wut v run glass vfio`, `wut v add glass vfio` —
and every acting op takes its terms whole and in any order, where `find` and `list` take the start of a word
([COMMANDS.md](COMMANDS.md)). `wut v add glass` is glass itself and never fans out over its variants, and `add` resolves
the variant back to the base for the service name, so the unit stays `qemu-glass.service` either way. `rem`, `sync` and
`tidy` act on that installed unit and so stop at the instance, and `find` lists the instance once however many variants
it has.

`list` with a term reads before it asks, as pack's does ([PACK.md](PACK.md)). `virtListed` is each manager's names
narrowed by the terms, every one starting a word of the name. The summary shows those names under each manager that has
any, the table counts them, and a picked manager's list is handed the terms and narrows by the same `virtListed`, so the
summary and the dump cannot drift. The terms are never rows: one row a term under every manager read as each holding an
instance by that name, and picking one of two terms dropped the other from the match.

An instance's name is also its hostname and its unit's name, so it has to be one nothing else on the host answers to:
not a manager's (`docker`, `lxc`, `podman`, `qemu`), not the host's own, and not one another manager's instance already
has. A pod counts as an instance here; a pod's containers and a qemu variant do not, since they are named after it.
Every acting op checks the whole of the host's config first, whatever was named, and a clash stops it before anything
runs: the config is what needs fixing, and a name half in use would leave two units or two hosts answering to it.

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

A config must state `-name {instance}`, though, and keep swtpm's socket and state under
`{tmp_qemu_dir_path}/{instance}`: that is how an instance's processes are found (`virtQemuMatch`, `virtSwtpmMatch`) for
the running check, the swtpm restart and `list`. Matching the instance name anywhere in a command line took any process
that held it, so starting `glass` killed `glass2`'s tpm.

The guest's `-smp` topology mirrors host performance cores (`virtQemuHostCores`): efficiency cores are left out — the
`cpu_core` list on intel hybrid, `cpu_capacity` elsewhere — and the cpu-pin script puts each vcpu on the host cpu
holding the same socket, core and thread, so the siblings the guest sees are siblings on the host.

`run` is the foreground spelling: no unit, no vfio unbind/rebind, no cpu pin. It works in a `run/` subdir of the tmp dir
and removes only that — never `/var/lib/qemu/<instance>`, which belongs to `add` and whose contents the installed unit
still points at. It also strips `-pidfile` and `-daemonize` from the merged args wherever they came from, or the
"foreground" run would detach and its own teardown would kill the VM it just started.

The generated `ExecStop` sends `system_powerdown` over QMP with `socat`, then waits for the pid to go. It exits
immediately if there is no QMP socket or no `socat`, rather than sitting out the whole timeout on a shutdown that was
never sent — so the qemu package must include `socat`.

## Qemu: the cpu pool and the host reserve

`cfg/virt/<sys_host>/limits.yaml` reserves cores per socket for the host:

```yaml
cpu:
  reserve:
    cores: 2
```

The rest of the host's performance cores are the pool. Every instance is sized against the whole pool, not against the
others, so instances that run at once share cores: one runs all the time, another now and then while it is idle.
`cpu.cores` in an instance takes that many from the pool; unset takes all of it. They come from its start, or its end
with `cpu.reverse: true`, so two instances that fit the pool together and take from opposite ends never overlap:

```yaml
qemu:
  architecture:
    x86_64:
      cpu:
        cores: 2
        reverse: true
```

A host without `limits.yaml` reserves nothing.

Before any virt add or sync, of any manager, the server sends the cores each qemu config wants, and the client checks
them against its own. One that does not fit blocks the op, since the configs cannot be deployed together until fixed:

```
virt blocked, qemu configs do not fit limits.yaml:
  glass wants 6 cores, 5 available
```

The reserve is where everything else runs while any qemu instance runs. The unit starts every process on it
(`CPUAffinity`), swtpm and qemu's own threads included; the cpu-pin script then moves each vcpu to its own host cpu, and
re-checks every 5s for threads that stray and interrupts the guest asks for late. Every other manager's containers run
under `machine.slice` — podman's by default, docker's by `cgroup-parent` in `daemon.json`, lxc's as `lxc@<name>` units
with a `Slice=machine.slice` drop-in — so the unit holds them all with one runtime
`systemctl set-property machine.slice` as it starts: the reserved cpus at a tenth of the default weight. The last qemu
instance to stop lets go, so an instance that is off holds nothing. `rem` it to free its cores for good. lxc's units are
what start them at boot, so `lxc.start.auto` is left out: `lxc.service` would start them first, outside the slice.

An instance that cannot be set up anyway (a missing NIC) is left as it was and listed under `failed:` at the end, with
exit 1.

All of it is written at add time, so a restart or reboot recalculates nothing. Like any config change, a new
`limits.yaml` reaches an instance on its next sync: after changing it, `wut v sync qemu`.

## Rem and sync act on what was added

`rem` undoes an add, and `sync` stops an instance and adds it again from the config as it is now, so both only have work
where an add already happened. The host's config names every instance the host could run, and the server cannot know
which of them were added, so `virtPlanRun` narrows a rem or sync plan with `virtPlanAdded` before the table, the way
`pack remove` and a named `pack sync` ask who already holds a package
([PACK.md](PACK.md#add-and-remove-ask-different-questions)). `virtInstanceHere` states it once, per manager:

| Manager  | Added means                                          |
| -------- | ---------------------------------------------------- |
| `docker` | the daemon holds its compose project, running or not |
| `lxc`    | `/var/lib/lxc/<instance>/config`                     |
| `podman` | `/etc/containers/systemd/<pod>.kube`                 |
| `qemu`   | `/etc/systemd/system/qemu-<instance>.service`        |

Three of those are a path check; docker leaves no file, so it asks `docker compose ls --all`, through `sudo` as its
other arms do. An instance that was never added is not offered, a manager left with none loses its rows, and a run with
nothing left says `instance not added: ...` instead of showing a table. Each manager's own `sync` arm asks the same
question again, so a direct call cannot install either. Wanting an instance that is not here is `add`.

## On or off is the host's

Whether an instance runs, now and at boot, belongs to the host once the instance exists. `add` sets it once: a new
instance is started and starts at boot, or with `--off` neither. After that `wut v on <instance>` and
`wut v off
<instance>` change it, through each manager's own standard switch, so the manager's own tools change it the
same way. `sync` reads it before it rewrites an instance and keeps it: it starts again only an instance that was
running, and leaves whether it starts at boot as it found it. `add` on an instance that exists keeps it the same way.

| Manager  | Starts at boot when                              | `on` / `off`                               |
| -------- | ------------------------------------------------ | ------------------------------------------ |
| `docker` | it was running, under `restart: unless-stopped`  | `docker compose start` / `stop`            |
| `lxc`    | `lxc@<instance>` is enabled                      | `systemctl enable --now` / `disable`, stop |
| `podman` | `<pod>.kube.d/install.conf` holds an `[Install]` | write or remove the drop-in, start / stop  |
| `qemu`   | `qemu-<instance>` is enabled                     | `systemctl enable --now` / `disable --now` |

lxc's own autostart, `lxc.start.auto`, stays unset: `lxc.service` would start those containers itself, outside their
`lxc@` units and so outside `machine.slice` and the host reserve. A quadlet unit is generated, so `systemctl enable`
does not apply to a pod; podman's documented way is an `[Install]` section, and its drop-in form lets the `.kube` be
rewritten without touching it (`podman-systemd.unit(5)`, enabling unit files). A docker stack keeps a stop across
reboots only under `restart: unless-stopped`; `always` starts what was stopped again whenever the daemon starts.

## Lxc: btrfs roots and a host-only bridge

On btrfs, `lxc-create` makes each root a subvolume of its own (`--bdev btrfs`, `lxc.rootfs.path = btrfs:...`), so a
snapshot of a container is instant and covers all of it, except a subvolume something inside makes of its own: btrfs
snapshots do not descend into nested subvolumes. Docker's default overlayfs makes none; its btrfs storage driver would.
A root made before that is a plain folder (`dir:`) until the container is removed and added again; the config follows
what is on disk, by the subvolume root's inode, 256.

An instance names its bridge in `network.link`. wut-config's `lxc/setup` serves `lxcbr0`, a bridge with no physical
port: networkd hands out ipv4 addresses and the host's dns, advertises an ipv6 ula prefix, and masquerades both.
Containers reach the host, each other, the lan and the internet, and nothing on the lan reaches them: they are for the
host's own services and for testing. Pods and vms stay on the lan bridge, where the router addresses them over ipv4 and
ipv6 itself.

## Qemu: a vm's data folder

`{virt_qemu_dir_path}/<instance>` holds an instance's disks. `add` makes it when it is missing, and on btrfs as a
subvolume with copy on write off (`chattr +C`), the usual setting for disk images there; a snapshot of it still works,
and is consistent only with the vm off. A folder that exists is left as it is, so `rem` and a later `add` find the disks
where they were, as every manager's `rem` leaves an instance's storage behind.

## Docker: the daemon keys wut owns

`docker.nu` owns a few keys of `/etc/docker/daemon.json`: `cgroup-parent` as `machine.slice`, and whatever
`cfg/virt/docker.yaml` names under `docker.daemon`. Add and sync set them, and the daemon restarts only when one
changed. wut-config's docker.yaml keeps docker from dropping forwarded traffic it did not set up, which would cut off
the host's other bridges, turns on ipv6 for the default bridge on a ula prefix and gives new networks ipv4 and ipv6
pools, the ipv4 one clear of `192.168.0.0/16`, which docker's own defaults include and lans use. A compose network still
asks for ipv6 itself, with `enable_ipv6: true`. Docker may run inside an lxc container, where wut manages it the same
way without knowing it is nested. The container shares the host's kernel, so wut-config's `docker/setup` loads no
modules there; the host loads the netfilter modules docker's rules need when they are first used (docker 29 on
iptables-nft needs none loaded beforehand).

## Snapshots: snap, unsnap, roll, unroll

What an instance owns is one btrfs subvolume: an lxc root, a qemu data folder, a pod's data folder
(`{virt_podman_dir_path}/<host>/<pod>`, made a subvolume by add). Its snapshots sit on the same filesystem, as btrfs
requires, under `back/<tier>` at that filesystem's mount, and are named as btrbk names its own:
`<manager>-<instance>-<live|full>.<timestamp>`, so the kind and the instance travel with a snapshot wherever it is
moved. A docker stack keeps its data in its binds, and glass on ext4 keeps no subvolume, so neither is snapshotted.

| Op       | Does                                                                             |
| -------- | -------------------------------------------------------------------------------- |
| `snap`   | live by default; `--full` stops a running instance first and starts it after     |
| `unsnap` | removes manual snapshots, picked from a list or named with `--to`                |
| `roll`   | stops it, keeps its current state in `back/roll`, swaps in a snapshot, starts it |
| `unroll` | puts back the state the last roll kept                                           |

The tier is `manual` unless `--tier <name>` names a btrbk config, `/etc/btrbk/<name>.conf`: then btrbk takes the
snapshot, keeps the tier to its retention and copies it to the other disk, and wut only stops and starts around it. That
is how a timer takes a full snapshot, which btrbk cannot, having no hooks. Nothing rotates `manual`; `roll` keeps one
snapshot per instance, the latest, replaced by each roll. `roll` goes to the latest snapshot of any tier but `roll`, or
to the one `--to` names in full or by its timestamp.

A btrfs snapshot shares every block with what it was taken of and costs only what changes after, so there is no chain to
merge: deleting a snapshot frees what only it held. A live snapshot is what the disk held at that instant, as after a
power cut, which databases recover from; a full one is clean. Every op holds the virt lock, and the swap in `roll` and
`unroll` also holds btrbk's lock file, `/run/lock/btrbk.lock`, taken with `flock` as btrbk itself takes it, so a timed
run never snapshots half a swap.

## Find

`find` emits `VIRT_FIND` as `manager -> ['pod=instances', ...]` and `virtFindRun` filters it by `virtManagerHere`,
reports `manager not installed: ...` when none survive, then shows the numbered manager/count table, takes a selection,
and prints what was picked. It is the one op that loads `virt.nu` without loading any per-manager file, since it never
calls one.

Non-podman entries carry an empty pod (`=alma,kali,void`) and print one level in; podman entries carry the pod and print
two. A variant is not another instance, so an instance with three of them still lists once.

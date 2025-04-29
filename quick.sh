#!/bin/bash

sudo -E sh -c 'echo 0 > /sys/class/vtconsole/vtcon0/bind'
sudo -E sh -c 'echo 0 > /sys/class/vtconsole/vtcon1/bind'
sudo -E sh -c 'echo efi-framebuffer.0 > /sys/bus/platform/drivers/efi-framebuffer/unbind'

sudo -E sh -c 'echo vfio-pci > /sys/bus/pci/devices/0000:01:00.2/driver_override'
sudo -E sh -c 'echo 0000:01:00.2 > /sys/bus/pci/devices/0000:01:00.2/driver/unbind'
sudo -E sh -c 'echo 0000:01:00.2 > /sys/bus/pci/drivers/vfio-pci/bind'
sudo -E sh -c 'echo > /sys/bus/pci/devices/0000:01:00.2/driver_override'

sudo -E sh -c 'mkdir -p /tmp/swtpm/glass'

sudo -E sh -c '/usr/bin/swtpm socket --ctrl type=unixio,path=/tmp/swtpm/glass/socket --log file --tpm2 --tpmstate dir=/tmp/swtpm/glass --daemon'

sudo -E sh -c '/usr/bin/qemu-system-x86_64 -name glass -machine type=q35,accel=kvm,pflash0=flash0,pflash1=flash1 -nodefaults -global ICH9-LPC.disable_s3=1 -global ICH9-LPC.disable_s4=1 -global driver=cfi.pflash01,property=secure,value=on -blockdev driver=file,node-name=flash0,read-only=on,filename=/virt/qemu/glass/OVMF_CODE_4M.ms.fd -blockdev driver=file,node-name=flash1,discard=unmap,filename=/virt/qemu/glass/OVMF_VARS_4M.ms.fd -boot menu=on -chardev socket,id=cdtpm0,path=/tmp/swtpm/glass/socket -tpmdev emulator,id=tpm0,chardev=cdtpm0 -device tpm-tis,tpmdev=tpm0 -rtc base=localtime,clock=host -cpu host,host-cache-info=on,migratable=off,+invtsc,+topoext,hv-relaxed,hv-vapic,hv-spinlocks=0x1fff,hv-vpindex,hv-runtime,hv-time,hv-synic,hv-stimer,hv-stimer-direct,hv-tlbflush,hv-tlbflush-direct,hv-tlbflush-ext,hv-frequencies,hv-reenlightenment,hv-xmm-input,hv-emsr-bitmap,hv-ipi,hv-avic -smp sockets=1,cores=8,threads=2 -m 24g -netdev tap,fd=3,id=net0,vhost=on,vhostfd=4 3<> /dev/tap4 4<> /dev/vhost-net -device virtio-net-pci,netdev=net0,mac=f2:40:7c:64:b2:8c -device virtio-rng-pci -device qemu-xhci -drive "if=none,media=cdrom,id=iso0,readonly=on,file=/data/ware/images/windows/Win11_24H2_English_x64.iso" -device usb-storage,drive=iso0,removable=true -drive "if=none,media=cdrom,id=iso1,readonly=on,file=/data/ware/images/windows/virtio-win-0.1.266.iso" -device usb-storage,drive=iso1,removable=true -object iothread,id=iot0 -device virtio-scsi-pci,id=scsi0,iothread=iot0 -blockdev driver=file,node-name=file0,aio=threads,cache.direct=off,discard=unmap,filename=/virt/qemu/glass/os.raw -blockdev driver=raw,node-name=ssd0,file=file0 -device scsi-hd,scsi-id=0,drive=ssd0,rotation_rate=1 -blockdev driver=host_device,node-name=file1,aio=native,cache.direct=on,discard=unmap,filename=/dev/disk/by-id/ata-CT2000MX500SSD1_1905E1E7E300 -blockdev driver=raw,node-name=ssd1,file=file1 -device scsi-hd,scsi-id=1,drive=ssd1,rotation_rate=1 -display none -device vfio-pci,host=01:00.0,multifunction=on -device vfio-pci,host=01:00.1 -device vfio-pci,host=01:00.2 -device vfio-pci,host=01:00.3 -monitor none -daemonize'

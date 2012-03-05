# Drone

A drone is a worker process that is running an Application.
Due to this, creation of drones implies creation of processes.

Drones should be limited to:

1. keeping a worker process alive (restart if necessary).
2. providing information and IPC to a process.
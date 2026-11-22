#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX 100
#define STATE_FILE "backend/tasks_state.dat"

struct Task
{
    int id;
    char name[50];
    int priority;
};

struct Task pq[MAX];
int size = 0;
int next_id = 1;

struct Task completed[MAX];
int completed_size = 0;

void sanitize_name(const char *src, char *dest, size_t max_len)
{
    size_t j = 0;
    for (size_t i = 0; src[i] != '\0' && j < max_len - 1; i++)
    {
        unsigned char c = (unsigned char)src[i];
        if (c == '\n' || c == '\r' || c == '\t')
        {
            dest[j++] = ' ';
        }
        else if (c >= 32)
        {
            dest[j++] = (char)c;
        }
    }
    dest[j] = '\0';
}

void print_json_escaped(const char *s)
{
    putchar('"');
    for (size_t i = 0; s[i] != '\0'; i++)
    {
        unsigned char c = (unsigned char)s[i];
        if (c == '"')
        {
            printf("\\\"");
        }
        else if (c == '\\')
        {
            printf("\\\\");
        }
        else if (c == '\n')
        {
            printf("\\n");
        }
        else if (c == '\r')
        {
            printf("\\r");
        }
        else if (c == '\t')
        {
            printf("\\t");
        }
        else if (c < 32)
        {
            printf("\\u%04x", c);
        }
        else
        {
            putchar(c);
        }
    }
    putchar('"');
}

void save_state(void)
{
    FILE *fp = fopen(STATE_FILE, "w");
    if (!fp)
    {
        return;
    }

    fprintf(fp, "%d %d %d\n", next_id, size, completed_size);
    for (int i = 0; i < size; i++)
    {
        fprintf(fp, "P\t%d\t%d\t%s\n", pq[i].id, pq[i].priority, pq[i].name);
    }
    for (int i = 0; i < completed_size; i++)
    {
        fprintf(fp, "C\t%d\t%d\t%s\n", completed[i].id, completed[i].priority, completed[i].name);
    }
    fclose(fp);
}

void reset_defaults(void)
{
    size = 0;
    completed_size = 0;
    next_id = 1;

    struct
    {
        const char *name;
        int priority;
        int is_completed;
    } defaults[] = {
        {"Audit API gateway rate-limit thresholds", 5, 0},
        {"Resolve production OAuth token timeout", 10, 0},
        {"Update weekly sprint changelog notes", 2, 0},
        {"Patch payment webhook retry backoff", 9, 0},
        {"Refactor PostgreSQL connection pooler", 6, 0},
        {"Migrate legacy static assets to CDN", 1, 1},
        {"Rotate staging TLS certificates", 8, 1},
    };

    int count = (int)(sizeof(defaults) / sizeof(defaults[0]));
    for (int i = 0; i < count; i++)
    {
        struct Task t;
        t.id = next_id++;
        t.priority = defaults[i].priority;
        sanitize_name(defaults[i].name, t.name, sizeof(t.name));

        if (defaults[i].is_completed)
        {
            if (completed_size < MAX)
            {
                completed[completed_size++] = t;
            }
        }
        else
        {
            if (size < MAX)
            {
                pq[size++] = t;
            }
        }
    }

    save_state();
}

void load_state(void)
{
    FILE *fp = fopen(STATE_FILE, "r");
    if (!fp)
    {
        reset_defaults();
        return;
    }

    int file_next_id = 1;
    int file_size = 0;
    int file_completed = 0;
    if (fscanf(fp, "%d %d %d\n", &file_next_id, &file_size, &file_completed) != 3)
    {
        fclose(fp);
        reset_defaults();
        return;
    }

    size = 0;
    completed_size = 0;
    next_id = file_next_id > 0 ? file_next_id : 1;

    char line[256];
    while (fgets(line, sizeof(line), fp) != NULL)
    {
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r'))
        {
            line[--len] = '\0';
        }
        if (len < 4)
        {
            continue;
        }

        char status_tag = line[0];
        char *tab1 = strchr(line, '\t');
        if (!tab1)
            continue;
        char *tab2 = strchr(tab1 + 1, '\t');
        if (!tab2)
            continue;
        char *tab3 = strchr(tab2 + 1, '\t');
        if (!tab3)
            continue;

        *tab2 = '\0';
        *tab3 = '\0';

        struct Task t;
        t.id = atoi(tab1 + 1);
        t.priority = atoi(tab2 + 1);
        sanitize_name(tab3 + 1, t.name, sizeof(t.name));

        if (t.id >= next_id)
        {
            next_id = t.id + 1;
        }

        if (status_tag == 'P' && size < MAX)
        {
            pq[size++] = t;
        }
        else if (status_tag == 'C' && completed_size < MAX)
        {
            completed[completed_size++] = t;
        }
    }

    fclose(fp);
}

int find_highest_index(void)
{
    if (size == 0)
        return -1;
    int highest = 0;
    for (int i = 1; i < size; i++)
    {
        if (pq[i].priority > pq[highest].priority)
        {
            highest = i;
        }
    }
    return highest;
}

int insert_task(const char *name, int priority, struct Task *out_task, char *err_buf, size_t err_len)
{
    if (size == MAX)
    {
        snprintf(err_buf, err_len, "Priority Queue is full!");
        return 0;
    }

    char clean[50];
    sanitize_name(name, clean, sizeof(clean));
    if (clean[0] == '\0')
    {
        snprintf(err_buf, err_len, "Task name cannot be empty.");
        return 0;
    }

    if (priority < 1 || priority > 10)
    {
        snprintf(err_buf, err_len, "Priority must be between 1 and 10.");
        return 0;
    }

    pq[size].id = next_id++;
    snprintf(pq[size].name, sizeof(pq[size].name), "%s", clean);
    pq[size].priority = priority;

    if (out_task)
    {
        *out_task = pq[size];
    }

    size++;
    save_state();
    return 1;
}

int process_task(struct Task *out_task, int *out_index, char *err_buf, size_t err_len)
{
    if (size == 0)
    {
        snprintf(err_buf, err_len, "Priority Queue is empty!");
        return 0;
    }

    int highest = find_highest_index();
    struct Task processed = pq[highest];

    for (int i = highest; i < size - 1; i++)
    {
        pq[i] = pq[i + 1];
    }
    size--;

    if (completed_size < MAX)
    {
        completed[completed_size++] = processed;
    }

    if (out_task)
    {
        *out_task = processed;
    }
    if (out_index)
    {
        *out_index = highest;
    }

    save_state();
    return 1;
}

int update_task_priority(int id, int new_priority, struct Task *out_task, char *err_buf, size_t err_len)
{
    if (size == 0 && completed_size == 0)
    {
        snprintf(err_buf, err_len, "Priority Queue is empty!");
        return 0;
    }

    if (new_priority < 1 || new_priority > 10)
    {
        snprintf(err_buf, err_len, "Priority must be between 1 and 10.");
        return 0;
    }

    for (int i = 0; i < size; i++)
    {
        if (pq[i].id == id)
        {
            pq[i].priority = new_priority;
            if (out_task)
                *out_task = pq[i];
            save_state();
            return 1;
        }
    }

    for (int i = 0; i < completed_size; i++)
    {
        if (completed[i].id == id)
        {
            completed[i].priority = new_priority;
            if (out_task)
                *out_task = completed[i];
            save_state();
            return 1;
        }
    }

    snprintf(err_buf, err_len, "Task not found!");
    return 0;
}

int edit_task_entry(int id, const char *name, int new_priority, struct Task *out_task, char *err_buf, size_t err_len)
{
    char clean[50];
    sanitize_name(name, clean, sizeof(clean));
    if (clean[0] == '\0')
    {
        snprintf(err_buf, err_len, "Task name cannot be empty.");
        return 0;
    }

    if (new_priority < 1 || new_priority > 10)
    {
        snprintf(err_buf, err_len, "Priority must be between 1 and 10.");
        return 0;
    }

    for (int i = 0; i < size; i++)
    {
        if (pq[i].id == id)
        {
            snprintf(pq[i].name, sizeof(pq[i].name), "%s", clean);
            pq[i].priority = new_priority;
            if (out_task)
                *out_task = pq[i];
            save_state();
            return 1;
        }
    }

    for (int i = 0; i < completed_size; i++)
    {
        if (completed[i].id == id)
        {
            snprintf(completed[i].name, sizeof(completed[i].name), "%s", clean);
            completed[i].priority = new_priority;
            if (out_task)
                *out_task = completed[i];
            save_state();
            return 1;
        }
    }

    snprintf(err_buf, err_len, "Task not found!");
    return 0;
}

int delete_task_entry(int id, char *err_buf, size_t err_len)
{
    for (int i = 0; i < size; i++)
    {
        if (pq[i].id == id)
        {
            for (int j = i; j < size - 1; j++)
            {
                pq[j] = pq[j + 1];
            }
            size--;
            save_state();
            return 1;
        }
    }

    for (int i = 0; i < completed_size; i++)
    {
        if (completed[i].id == id)
        {
            for (int j = i; j < completed_size - 1; j++)
            {
                completed[j] = completed[j + 1];
            }
            completed_size--;
            save_state();
            return 1;
        }
    }

    snprintf(err_buf, err_len, "Task not found!");
    return 0;
}

void print_task_json(const struct Task *t, const char *status)
{
    printf("{\"id\":%d,\"name\":", t->id);
    print_json_escaped(t->name);
    printf(",\"priority\":%d,\"status\":", t->priority);
    print_json_escaped(status);
    printf("}");
}

void print_state_json(int ok, const char *message, const struct Task *affected, int affected_index, const char *affected_status)
{
    int highest_idx = find_highest_index();

    printf("{\"ok\":%s,\"message\":", ok ? "true" : "false");
    print_json_escaped(message ? message : "");
    printf(",\"maxCapacity\":%d,\"size\":%d,\"completedSize\":%d,\"nextId\":%d,\"nextPendingIndex\":%d",
           MAX, size, completed_size, next_id, highest_idx);

    if (highest_idx >= 0)
    {
        printf(",\"nextTask\":");
        print_task_json(&pq[highest_idx], "Pending");
    }
    else
    {
        printf(",\"nextTask\":null");
    }

    if (affected)
    {
        printf(",\"affectedTask\":");
        print_task_json(affected, affected_status ? affected_status : "Pending");
        printf(",\"affectedIndex\":%d", affected_index);
    }

    printf(",\"tasks\":[");
    int first = 1;
    for (int i = 0; i < size; i++)
    {
        if (!first)
            putchar(',');
        print_task_json(&pq[i], "Pending");
        first = 0;
    }
    for (int i = 0; i < completed_size; i++)
    {
        if (!first)
            putchar(',');
        print_task_json(&completed[i], "Completed");
        first = 0;
    }
    printf("]}\n");
    fflush(stdout);
}

int run_server_loop(void)
{
    load_state();
    char line[512];

    while (fgets(line, sizeof(line), stdin) != NULL)
    {
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r'))
        {
            line[--len] = '\0';
        }
        if (len == 0)
            continue;

        char err[128] = {0};

        if (strcmp(line, "LIST") == 0)
        {
            print_state_json(1, "OK", NULL, -1, NULL);
        }
        else if (strncmp(line, "INSERT ", 7) == 0)
        {
            char *sep = strchr(line + 7, '|');
            if (!sep)
            {
                print_state_json(0, "Invalid INSERT payload", NULL, -1, NULL);
                continue;
            }
            *sep = '\0';
            int priority = atoi(line + 7);
            const char *name = sep + 1;
            struct Task created;
            if (insert_task(name, priority, &created, err, sizeof(err)))
            {
                print_state_json(1, "Task inserted successfully!", &created, size - 1, "Pending");
            }
            else
            {
                print_state_json(0, err, NULL, -1, NULL);
            }
        }
        else if (strcmp(line, "PROCESS") == 0)
        {
            struct Task processed;
            int idx = -1;
            if (process_task(&processed, &idx, err, sizeof(err)))
            {
                print_state_json(1, "Task processed successfully!", &processed, idx, "Completed");
            }
            else
            {
                print_state_json(0, err, NULL, -1, NULL);
            }
        }
        else if (strncmp(line, "UPDATE ", 7) == 0)
        {
            int id = 0;
            int priority = 0;
            if (sscanf(line + 7, "%d %d", &id, &priority) != 2)
            {
                print_state_json(0, "Invalid UPDATE payload", NULL, -1, NULL);
                continue;
            }
            struct Task updated;
            if (update_task_priority(id, priority, &updated, err, sizeof(err)))
            {
                print_state_json(1, "Priority updated successfully!", &updated, -1, NULL);
            }
            else
            {
                print_state_json(0, err, NULL, -1, NULL);
            }
        }
        else if (strncmp(line, "EDIT ", 5) == 0)
        {
            char *sep = strchr(line + 5, '|');
            if (!sep)
            {
                print_state_json(0, "Invalid EDIT payload", NULL, -1, NULL);
                continue;
            }
            *sep = '\0';
            int id = 0;
            int priority = 0;
            if (sscanf(line + 5, "%d %d", &id, &priority) != 2)
            {
                print_state_json(0, "Invalid EDIT parameters", NULL, -1, NULL);
                continue;
            }
            const char *name = sep + 1;
            struct Task updated;
            if (edit_task_entry(id, name, priority, &updated, err, sizeof(err)))
            {
                print_state_json(1, "Task updated successfully!", &updated, -1, NULL);
            }
            else
            {
                print_state_json(0, err, NULL, -1, NULL);
            }
        }
        else if (strncmp(line, "DELETE ", 7) == 0)
        {
            int id = atoi(line + 7);
            if (delete_task_entry(id, err, sizeof(err)))
            {
                print_state_json(1, "Task deleted successfully!", NULL, -1, NULL);
            }
            else
            {
                print_state_json(0, err, NULL, -1, NULL);
            }
        }
        else if (strcmp(line, "CLEAR_COMPLETED") == 0)
        {
            completed_size = 0;
            save_state();
            print_state_json(1, "Completed tasks cleared!", NULL, -1, NULL);
        }
        else if (strcmp(line, "RESET") == 0)
        {
            reset_defaults();
            print_state_json(1, "Default sample tasks restored!", NULL, -1, NULL);
        }
        else
        {
            print_state_json(0, "Unknown command", NULL, -1, NULL);
        }
    }

    return 0;
}

// Interactive CLI wrappers matching the original C program
void cli_insert(void)
{
    char name[50];
    int priority;
    struct Task created;
    char err[128] = {0};

    if (size == MAX)
    {
        printf("Priority Queue is full!\n");
        return;
    }

    printf("Enter task name: ");
    scanf(" %49[^\n]", name);

    printf("Enter priority: ");
    scanf("%d", &priority);

    if (insert_task(name, priority, &created, err, sizeof(err)))
    {
        printf("Task inserted successfully!\n");
    }
    else
    {
        printf("%s\n", err);
    }
}

void cli_process(void)
{
    struct Task processed;
    char err[128] = {0};
    if (process_task(&processed, NULL, err, sizeof(err)))
    {
        printf("Processed Task: %s\n", processed.name);
    }
    else
    {
        printf("%s\n", err);
    }
}

void cli_display(void)
{
    if (size == 0)
    {
        printf("Priority Queue is empty!\n");
        return;
    }

    printf("\nID\tTask Name\tPriority\n");
    printf("--------------------------------\n");

    for (int i = 0; i < size; i++)
    {
        printf("%d\t%s\t\t%d\n", pq[i].id, pq[i].name, pq[i].priority);
    }
}

void cli_update(void)
{
    int id, new_priority;
    char err[128] = {0};
    if (size == 0)
    {
        printf("Priority Queue is empty!\n");
        return;
    }

    printf("Enter Task ID to update: ");
    scanf("%d", &id);
    printf("Enter new priority: ");
    scanf("%d", &new_priority);

    if (update_task_priority(id, new_priority, NULL, err, sizeof(err)))
    {
        printf("Priority updated successfully!\n");
    }
    else
    {
        printf("%s\n", err);
    }
}

int main(int argc, char *argv[])
{
    if (argc > 1 && strcmp(argv[1], "--server") == 0)
    {
        return run_server_loop();
    }

    load_state();
    int choice;

    do
    {
        printf("\n--- Priority Based Task Manager ---\n");
        printf("1. Insert Task\n");
        printf("2. Process Highest Priority Task\n");
        printf("3. Display All Tasks\n");
        printf("4. Update Task Priority\n");
        printf("5. Exit\n");

        printf("Enter your choice: ");
        if (scanf("%d", &choice) != 1)
        {
            break;
        }

        switch (choice)
        {
        case 1:
            cli_insert();
            break;
        case 2:
            cli_process();
            break;
        case 3:
            cli_display();
            break;
        case 4:
            cli_update();
            break;
        case 5:
            printf("Exiting Task Manager...\n");
            break;
        default:
            printf("Invalid choice!\n");
        }
    } while (choice != 5);

    return 0;
}

// Text beats: each .beat carries data-in / data-out in section progress.
// We only toggle classes; CSS does the kinetic reveal (cheap, interruptible, reversible).
export class Beats {
  constructor(sections) {
    this.groups = sections.map((sec) => [...sec.querySelectorAll('.beat')].map((el) => ({
      el,
      in: parseFloat(el.dataset.in),
      out: parseFloat(el.dataset.out),
      state: '',
    })));
    this.enabled = false;
  }

  update(index, progress) {
    if (!this.enabled) return;
    this.groups.forEach((g, i) => {
      for (const b of g) {
        let state = '';
        if (i === index && progress >= b.in && progress <= b.out) state = 'on';
        else if (i < index || (i === index && progress > b.out)) state = 'past';
        if (state === b.state) continue;
        b.state = state;
        b.el.classList.toggle('is-on', state === 'on');
        b.el.classList.toggle('is-past', state === 'past');
      }
    });
  }
}
